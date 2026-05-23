package com.library.paymentservice.service;

import com.library.paymentservice.dto.MembershipPlanDTO;
import com.library.paymentservice.dto.MembershipStatusDTO;
import com.library.paymentservice.dto.PaymentConfirmationRequest;
import com.library.paymentservice.dto.PaymentDTO;
import com.library.paymentservice.dto.PaymentHistoryDTO;
import com.library.paymentservice.dto.PaymentSessionDTO;
import com.library.paymentservice.dto.PaymentStatsDTO;
import com.library.paymentservice.dto.PaymentsResponseDTO;
import com.library.paymentservice.dto.PendingRenewalsDTO;
import com.library.paymentservice.dto.RevenueReportDTO;
import com.library.paymentservice.entity.MembershipFeeEntity;
import com.library.paymentservice.entity.MembershipPlanEntity;
import com.library.paymentservice.entity.PaymentPlan;
import com.library.paymentservice.repository.MembershipFeeRepository;
import com.library.paymentservice.repository.MembershipPlanRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final MembershipFeeRepository membershipFeeRepository;
    private final MembershipPlanRepository planRepository;
    private final PaymentNotificationService notificationService;
    private final Map<String, PaymentSession> sessions = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public PaymentService(MembershipFeeRepository membershipFeeRepository,
            MembershipPlanRepository planRepository,
            PaymentNotificationService notificationService) {
        this.membershipFeeRepository = membershipFeeRepository;
        this.planRepository = planRepository;
        this.notificationService = notificationService;
    }

    public List<MembershipPlanDTO> getPlans() {
        return planRepository.findByActiveTrueOrderByPriceAsc().stream()
                .map(this::toPlanDTO)
                .collect(Collectors.toList());
    }

    public PaymentSessionDTO initiatePayment(String planName, String studentId) {
        MembershipPlanEntity plan = planRepository.findByNameIgnoreCase(planName)
                .filter(MembershipPlanEntity::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Invalid payment plan: " + planName));
        String sessionId = generateSessionId();
        PaymentSession session = new PaymentSession();
        session.setSessionId(sessionId);
        session.setPlan(plan.getName());
        session.setStudentId(studentId);
        session.setExpiresAt(System.currentTimeMillis() + 300_000);
        sessions.put(sessionId, session);

        return PaymentSessionDTO.builder()
                .sessionId(sessionId)
                .amount(plan.getPrice().intValue())
                .plan(plan.getName())
                .expiresIn(300)
                .build();
    }

    @SuppressWarnings("null")
    @Transactional
    public void confirmPayment(PaymentConfirmationRequest request) {
        PaymentSession session = sessions.get(request.getSessionId());
        if (session == null || session.isExpired()) {
            throw new IllegalArgumentException("Payment session expired or invalid");
        }
        if (Boolean.FALSE.equals(request.getSimulateSuccess())) {
            sessions.remove(request.getSessionId());
            throw new IllegalStateException("Payment failed during simulation");
        }

        MembershipPlanEntity plan = planRepository.findByNameIgnoreCase(session.plan)
                .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + session.plan));
        MembershipStatusDTO currentStatus = getMembershipStatus(session.studentId);
        LocalDate baseDate = currentStatus.isActive() && currentStatus.getExpiryDate() != null
                ? currentStatus.getExpiryDate()
                : LocalDate.now();
        LocalDate expiry = baseDate.plusDays(plan.getDurationDays());
        String txnId = generateTransactionId();

        MembershipFeeEntity fee = MembershipFeeEntity.builder()
                .studentId(session.studentId)
                .plan(plan.getName())
                .amount(plan.getPrice())
                .transactionId(txnId)
                .cardLastFour(request.getCardLastFour())
                .expiryDate(expiry)
                .build();
        membershipFeeRepository.save(fee);
        notificationService.sendMembershipPaymentNotification(fee);
        sessions.remove(session.sessionId);
    }

    public MembershipStatusDTO getMembershipStatus(String studentId) {
        return membershipFeeRepository.findByStudentIdOrderByPaidAtDesc(studentId).stream()
                .findFirst()
                .map(this::toMembershipStatus)
                .orElse(MembershipStatusDTO.builder()
                        .active(false)
                        .expiryDate(null)
                        .plan(null)
                        .build());
    }

    public boolean isMembershipActive(String studentId) {
        MembershipStatusDTO status = getMembershipStatus(studentId);
        return status.isActive();
    }

    public List<PaymentHistoryDTO> getPaymentHistory(String studentId) {
        return membershipFeeRepository.findByStudentIdOrderByPaidAtDesc(studentId).stream()
                .map(this::toPaymentHistory)
                .collect(Collectors.toList());
    }

    public List<PaymentHistoryDTO> getAllPayments() {
        return membershipFeeRepository.findAll().stream()
                .sorted(Comparator.comparing(MembershipFeeEntity::getPaidAt).reversed())
                .map(this::toPaymentHistory)
                .collect(Collectors.toList());
    }

    public PaymentsResponseDTO getAllPayments(String plan, String studentId, String month, int page, int size) {
        List<PaymentHistoryDTO> payments = membershipFeeRepository.findAll().stream()
                .filter(entity -> plan == null || entity.getPlan().equalsIgnoreCase(plan))
                .filter(entity -> studentId == null || entity.getStudentId().equalsIgnoreCase(studentId))
                .filter(entity -> month == null || getMonthKey(entity).equals(month))
                .sorted(Comparator.comparing(MembershipFeeEntity::getPaidAt).reversed())
                .map(this::toPaymentHistory)
                .collect(Collectors.toList());

        BigDecimal totalRevenue = payments.stream()
                .map(PaymentHistoryDTO::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int from = Math.max(0, page * size);
        int to = Math.min(from + size, payments.size());
        List<PaymentHistoryDTO> pageContent = from < payments.size() ? payments.subList(from, to) : List.of();

        return PaymentsResponseDTO.builder()
                .payments(pageContent)
                .totalRevenue(totalRevenue)
                .build();
    }

    public PendingRenewalsDTO getPendingRenewals(int days) {
        Map<String, MembershipFeeEntity> latestByStudent = membershipFeeRepository.findAll().stream()
                .collect(Collectors.toMap(MembershipFeeEntity::getStudentId,
                        entity -> entity,
                        (existing, replacement) -> existing.getPaidAt().isAfter(replacement.getPaidAt()) ? existing
                                : replacement));

        int count = (int) latestByStudent.values().stream()
                .filter(entity -> {
                    if (entity.getExpiryDate() == null) {
                        return false;
                    }
                    long daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.now(),
                            entity.getExpiryDate());
                    return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
                })
                .count();

        return PendingRenewalsDTO.builder()
                .count(count)
                .build();
    }

    public Map<String, Map<String, BigDecimal>> getRevenueByMonth() {
        return membershipFeeRepository.findAll().stream()
                .collect(Collectors.groupingBy(this::getMonthKey,
                        Collectors.groupingBy(MembershipFeeEntity::getPlan,
                                Collectors.mapping(MembershipFeeEntity::getAmount,
                                        Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)))));
    }

    public PaymentStatsDTO getRevenueStats() {
        Map<String, Map<String, BigDecimal>> revenueByMonthByPlan = getRevenueByMonth();
        BigDecimal totalRevenue = revenueByMonthByPlan.values().stream()
                .flatMap(map -> map.values().stream())
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return PaymentStatsDTO.builder()
                .revenueByMonthByPlan(revenueByMonthByPlan)
                .totalRevenue(totalRevenue)
                .build();
    }

    public RevenueReportDTO getRevenueReport(String month, LocalDate from, LocalDate to) {
        List<MembershipFeeEntity> filtered = membershipFeeRepository.findAll().stream()
                .filter(entity -> {
                    LocalDate paidDate = entity.getPaidAt().toLocalDate();
                    if (from != null && to != null) {
                        return !paidDate.isBefore(from) && !paidDate.isAfter(to);
                    }
                    return month == null || getMonthKey(entity).equals(month);
                })
                .toList();
        Map<String, BigDecimal> byPlan = filtered.stream()
                .collect(Collectors.groupingBy(MembershipFeeEntity::getPlan,
                        Collectors.mapping(MembershipFeeEntity::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));
        Map<String, BigDecimal> dailyBreakdown = filtered.stream()
                .collect(Collectors.groupingBy(entity -> entity.getPaidAt().toLocalDate().toString(),
                        Collectors.mapping(MembershipFeeEntity::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));
        BigDecimal totalRevenue = byPlan.values().stream()
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return RevenueReportDTO.builder()
                .month(month)
                .totalRevenue(totalRevenue)
                .totalTransactions(filtered.size())
                .revenueByPlan(byPlan)
                .dailyBreakdown(dailyBreakdown)
                .build();
    }

    private String getMonthKey(MembershipFeeEntity entity) {
        return YearMonth.from(entity.getPaidAt().toLocalDate()).format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }

    private PaymentHistoryDTO toPaymentHistory(MembershipFeeEntity entity) {
        return PaymentHistoryDTO.builder()
                .transactionId(entity.getTransactionId())
                .plan(entity.getPlan())
                .amount(entity.getAmount())
                .cardLastFour(entity.getCardLastFour())
                .expiryDate(entity.getExpiryDate())
                .paidAt(entity.getPaidAt())
                .build();
    }

    private MembershipStatusDTO toMembershipStatus(MembershipFeeEntity entity) {
        return MembershipStatusDTO.builder()
                .active(entity.getExpiryDate() != null && !entity.getExpiryDate().isBefore(LocalDate.now()))
                .expiryDate(entity.getExpiryDate())
                .plan(entity.getPlan())
                .build();
    }

    private String generateSessionId() {
        return UUID.randomUUID().toString();
    }

    public String generateTransactionId() {
        return String.format("TXN-%d-%06d", System.currentTimeMillis(), random.nextInt(1_000_000));
    }

    private MembershipPlanDTO toPlanDTO(MembershipPlanEntity e) {
        List<String> features = (e.getFeaturesCsv() == null || e.getFeaturesCsv().isBlank())
                ? List.of()
                : java.util.Arrays.stream(e.getFeaturesCsv().split(","))
                        .map(String::trim).filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
        return MembershipPlanDTO.builder()
                .id(e.getId())
                .name(e.getName())
                .displayName(e.getDisplayName())
                .price(e.getPrice())
                .durationDays(e.getDurationDays())
                .description(e.getDescription())
                .features(features)
                .badgeText(e.getBadgeText())
                .featured(e.isFeatured())
                .active(e.isActive())
                .build();
    }

    private static class PaymentSession {
        private String sessionId;
        private String plan;
        private String studentId;
        private long expiresAt;

        public void setSessionId(String sessionId) {
            this.sessionId = sessionId;
        }

        public void setPlan(String plan) {
            this.plan = plan;
        }

        public void setStudentId(String studentId) {
            this.studentId = studentId;
        }

        public void setExpiresAt(long expiresAt) {
            this.expiresAt = expiresAt;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }
}
