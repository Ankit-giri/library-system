package com.library.notificationservice.service;

import com.library.notificationservice.dto.NotificationDTO;
import com.library.notificationservice.entity.MembershipExpiryEntity;
import com.library.notificationservice.entity.NotificationEntity;
import com.library.notificationservice.event.AdminAlertEvent;
import com.library.notificationservice.event.BookingCancellationEvent;
import com.library.notificationservice.event.BookingConfirmationEvent;
import com.library.notificationservice.event.MembershipExpiryEvent;
import com.library.notificationservice.event.PaymentFailureEvent;
import com.library.notificationservice.event.PaymentSuccessEvent;
import com.library.notificationservice.config.AdminUrlProperties;
import com.library.notificationservice.dto.SimulatedEmailDTO;
import com.library.notificationservice.entity.SimulatedEmailEntity;
import com.library.notificationservice.repository.MembershipExpiryRepository;
import com.library.notificationservice.repository.NotificationRepository;
import com.library.notificationservice.repository.SimulatedEmailRepository;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final MembershipExpiryRepository membershipExpiryRepository;
    private final EmailSimulatorService emailSimulatorService;
    private final SimulatedEmailRepository simulatedEmailRepository;
    private final RestTemplate restTemplate;
    private final AdminUrlProperties adminUrlProperties;

    public NotificationService(
            NotificationRepository notificationRepository,
            MembershipExpiryRepository membershipExpiryRepository,
            EmailSimulatorService emailSimulatorService,
            SimulatedEmailRepository simulatedEmailRepository,
            RestTemplate restTemplate,
            AdminUrlProperties adminUrlProperties) {
        this.notificationRepository = notificationRepository;
        this.membershipExpiryRepository = membershipExpiryRepository;
        this.emailSimulatorService = emailSimulatorService;
        this.simulatedEmailRepository = simulatedEmailRepository;
        this.restTemplate = restTemplate;
        this.adminUrlProperties = adminUrlProperties;
    }

    public Page<NotificationDTO> getNotifications(String userId, Pageable pageable) {
        return notificationRepository
                .findByUserId(userId, pageable)
                .map(this::toDto);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public Page<SimulatedEmailDTO> getSentEmails(Pageable pageable) {
        Objects.requireNonNull(pageable, "pageable");
        return simulatedEmailRepository.findAll(pageable)
                .map(this::toSimulatedEmailDto);
    }

    @Transactional
    public void broadcastEmail(String subject, String message) {
        String url = adminUrlProperties.getAuthServiceUrl() + "/api/admin/students?page=0&size=500";
        try {
            var response = restTemplate.getForEntity(url, Map.class);
            Object bodyObject = response.getBody();
            if (bodyObject instanceof Map<?, ?> body && body.get("content") instanceof List<?> content) {
                content.stream()
                        .filter(Map.class::isInstance)
                        .map(Map.class::cast)
                        .map(entry -> (String) entry.get("email"))
                        .distinct()
                        .forEach(recipient -> emailSimulatorService.sendEmail(recipient, recipient,
                                subject, message));
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to broadcast email to student list", ex);
        }
    }

    @Transactional
    public NotificationDTO markNotificationAsRead(String userId, long notificationId) {
        NotificationEntity notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Notification does not belong to the provided user");
        }

        if (!notification.getRead()) {
            notification.setRead(true);
            notification.setReadAt(OffsetDateTime.now(ZoneOffset.UTC));
            notification = notificationRepository.save(notification);
        }

        return toDto(notification);
    }

    @Transactional
    public void markAllNotificationsRead(String userId) {
        List<NotificationEntity> unread = notificationRepository.findByUserId(userId, Pageable.unpaged())
                .stream()
                .filter(notification -> !notification.getRead())
                .collect(Collectors.toList());

        if (!unread.isEmpty()) {
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            unread.forEach(notification -> {
                notification.setRead(true);
                notification.setReadAt(now);
            });
            notificationRepository.saveAll(unread);
        }
    }

    public void recordMembershipExpiry(String userId, OffsetDateTime expiryDateTime) {
        MembershipExpiryEntity expiry = new MembershipExpiryEntity();
        expiry.setUserId(userId);
        expiry.setExpiryDate(expiryDateTime.toLocalDate());
        membershipExpiryRepository.save(expiry);
    }

    public void sendBookingConfirmation(String userId, String bookingReference, String details) {
        String title = "Seat Booking Confirmed";
        String message = String.format("Your booking %s has been confirmed. %s", bookingReference, details);
        createNotification(userId, title, message, "BOOKING", "IN_APP");
        emailSimulatorService.sendEmail(userId, userId + "@example.com", title, message);
    }

    public void sendBookingCancellation(String userId, String bookingReference, String reason) {
        String title = "Booking Cancellation Notice";
        String message = String.format("Your booking %s was cancelled. Reason: %s", bookingReference, reason);
        createNotification(userId, title, message, "BOOKING", "IN_APP");
        emailSimulatorService.sendEmail(userId, userId + "@example.com", title, message);
    }

    public void sendPaymentSuccess(String userId, String paymentReference, String amount, String details) {
        String title = "Payment Successful";
        String message = String.format("Payment %s for %s was completed. %s", paymentReference, amount, details);
        createNotification(userId, title, message, "PAYMENT", "BOTH");
        emailSimulatorService.sendEmail(userId, userId + "@example.com", title, message);
    }

    public void sendPaymentFailure(String userId, String paymentReference, String amount, String failureReason) {
        String title = "Payment Failed";
        String message = String.format("Payment %s for %s failed. Reason: %s", paymentReference, amount, failureReason);
        createNotification(userId, title, message, "PAYMENT", "BOTH");
        emailSimulatorService.sendEmail(userId, userId + "@example.com", title, message);
    }

    public void sendMembershipExpiryReminder(String userId, int daysUntilExpiry) {
        String title = "Membership Expiry Reminder";
        String message = String.format("Your membership will expire in %d days. Renew early to avoid disruption.",
                daysUntilExpiry);
        createNotification(userId, title, message, "MEMBERSHIP", "IN_APP");
        emailSimulatorService.sendEmail(userId, userId + "@example.com", title, message);
    }

    public void sendAdminAlert(String message) {
        createNotification("ADMIN", "Admin Alert", message, "ADMIN", "IN_APP");
    }

    public void sendAdminAlert(String userId, String message) {
        createNotification(userId, "Admin Alert", message, "ADMIN", "IN_APP");
    }

    @Transactional
    public void markStaleNotificationsRead() {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
        List<NotificationEntity> stale = notificationRepository.findByReadFalseAndCreatedAtBefore(cutoff);
        if (!stale.isEmpty()) {
            stale.forEach(notification -> {
                notification.setRead(true);
                notification.setReadAt(OffsetDateTime.now(ZoneOffset.UTC));
            });
            notificationRepository.saveAll(stale);
        }
    }

    @EventListener
    public void handleBookingConfirmationEvent(BookingConfirmationEvent event) {
        sendBookingConfirmation(event.getUserId(), event.getBookingReference(), event.getDetails());
    }

    @EventListener
    public void handleBookingCancellationEvent(BookingCancellationEvent event) {
        sendBookingCancellation(event.getUserId(), event.getBookingReference(), event.getReason());
    }

    @EventListener
    public void handlePaymentSuccessEvent(PaymentSuccessEvent event) {
        sendPaymentSuccess(event.getUserId(), event.getPaymentReference(), event.getAmount(), event.getDetails());
    }

    @EventListener
    public void handlePaymentFailureEvent(PaymentFailureEvent event) {
        sendPaymentFailure(event.getUserId(), event.getPaymentReference(), event.getAmount(), event.getFailureReason());
    }

    @EventListener
    public void handleMembershipExpiryEvent(MembershipExpiryEvent event) {
        sendMembershipExpiryReminder(event.getUserId(), event.getDaysUntilExpiry());
    }

    @EventListener
    public void handleAdminAlertEvent(AdminAlertEvent event) {
        sendAdminAlert(event.getUserId(), event.getMessage());
    }

    private NotificationEntity createNotification(String userId, String title, String message, String type,
            String channel) {
        NotificationEntity notification = new NotificationEntity();
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setChannel(channel);
        notification.setRead(false);
        notification.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return notificationRepository.save(notification);
    }

    private NotificationDTO toDto(NotificationEntity entity) {
        return NotificationDTO.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .type(entity.getType())
                .channel(entity.getChannel())
                .read(entity.getRead())
                .createdAt(entity.getCreatedAt())
                .readAt(entity.getReadAt())
                .build();
    }

    private SimulatedEmailDTO toSimulatedEmailDto(SimulatedEmailEntity entity) {
        return SimulatedEmailDTO.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .recipient(entity.getRecipient())
                .subject(entity.getSubject())
                .body(entity.getBody())
                .status(entity.getStatus())
                .sentAt(entity.getSentAt())
                .build();
    }
}
