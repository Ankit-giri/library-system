package com.library.notificationservice.scheduler;

import com.library.notificationservice.repository.MembershipExpiryRepository;
import com.library.notificationservice.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class NotificationScheduler {
    private static final Logger log = LoggerFactory.getLogger(NotificationScheduler.class);
    private final MembershipExpiryRepository membershipExpiryRepository;
    private final NotificationService notificationService;

    public NotificationScheduler(MembershipExpiryRepository membershipExpiryRepository,
            NotificationService notificationService) {
        this.membershipExpiryRepository = membershipExpiryRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 8 * * *")
    public void sendMembershipExpiryReminders() {
        LocalDate targetDate = LocalDate.now().plusDays(3);
        List.of(targetDate).forEach(date -> log.info("Checking membership expiries for {}", date));
        membershipExpiryRepository.findByExpiryDate(targetDate)
                .forEach(expiry -> notificationService.sendMembershipExpiryReminder(expiry.getUserId(), 3));
    }

    @Scheduled(cron = "0 0 * * * *")
    public void markStaleNotificationsRead() {
        log.info("Running stale notification cleanup");
        notificationService.markStaleNotificationsRead();
    }
}
