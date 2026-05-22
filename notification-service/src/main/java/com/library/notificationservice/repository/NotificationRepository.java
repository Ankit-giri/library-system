package com.library.notificationservice.repository;

import com.library.notificationservice.entity.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    Page<NotificationEntity> findByUserId(String userId, Pageable pageable);

    long countByUserIdAndReadFalse(String userId);

    List<NotificationEntity> findByReadFalseAndCreatedAtBefore(OffsetDateTime cutoff);
}
