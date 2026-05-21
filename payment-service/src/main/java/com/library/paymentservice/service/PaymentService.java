package com.library.paymentservice.service;

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
import com.library.paymentservice.entity.PaymentPlan;
import com.library.paymentservice.repository.MembershipFeeRepository;
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
    private final PaymentNotificationService notificationService;
    private final Map<String, PaymentSession> sessions = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public PaymentService(MembershipFeeRepository membershipFeeRepository,
            PaymentNotificationService notificationService) {
        this.membershipFeeRepository = membershipFeeRepository;
        this.notificationService = notificationService;
    }

    public List<PaymentDTO> getPlans() {
        return List.of(PaymentPlan.values()).stream()
                .map(PaymentPlan::toDto)
                .collect(Collectors.toList());
    }

    public PaymentSessionDTO initiatePayment(String planName, String studentId) {
        PaymentPlan plan = parsePlan(planName);
        String sessionId = generateSessionId();
        PaymentSession session = new PaymentSession();
        session.setSessionId(sessionId);
        session.setPlan(plan.name());
        session.setStudentId(studentId);
        session.setExpiresAt(System.currentTimeMillis() + 300_000);
        sessions.put(sessionId, session);

        return PaymentSessionDTO.builder()
                .sessionId(sessionId)
                .amount(plan.getPrice())
                .plan(plan.name())
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

        PaymentPlan plan = parsePlan(session.plan);
        MembershipStatusDTO currentStatus = getMembershipStatus(session.studentId);
        LocalDate baseDate = currentStatus.isActive() && currentStatus.getExpiryDate() != null
                ? currentStatus.getExpiryDate()
                : LocalDate.now();
        LocalDate expiry = baseDate.plusDays(plan.getDurationDays());
        String txnId = generateTransactionId();

        MembershipFeeEntity fee = MembershipFeeEntity.builder()
                .studentId(session.studentId)
                .plan(plan.name())
                .amount(BigDecimal.valueOf(plan.getPrice()))
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

    public RevenueReportDTO getRevenueReport(String month) {
        Map<String, BigDecimal> byPlan = membershipFeeRepository.findAll().stream()
                .filter(entity -> month == null || getMonthKey(entity).equals(month))
                .collect(Collectors.groupingBy(MembershipFeeEntity::getPlan,
                        Collectors.mapping(MembershipFeeEntity::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));
        Map<String, BigDecimal> dailyBreakdown = membershipFeeRepository.findAll().stream()
                .filter(entity -> month == null || getMonthKey(entity).equals(month))
                .collect(Collectors.groupingBy(entity -> entity.getPaidAt().toLocalDate().toString(),
                        Collectors.mapping(MembershipFeeEntity::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));
        BigDecimal totalRevenue = byPlan.values().stream()
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return RevenueReportDTO.builder()
                .month(month)
                .totalRevenue(totalRevenue)
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

    public LocalDate calculateExpiryDate(PaymentPlan plan) {
        return LocalDate.now().plusDays(plan.getDurationDays());
    }

    private PaymentPlan parsePlan(String planName) {
        try {
            return PaymentPlan.valueOf(planName.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid payment plan: " + planName);
        }
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
