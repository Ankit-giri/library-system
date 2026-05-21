package com.library.seatbooking.repository;

import com.library.seatbooking.entity.NotificationEntity;
import com.library.seatbooking.entity.NotificationType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findByUser_Id(Long userId);

    List<NotificationEntity> findByUser_IdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    List<NotificationEntity> findByType(NotificationType type);

    List<NotificationEntity> findByUser_IdAndType(Long userId, NotificationType type);
}
