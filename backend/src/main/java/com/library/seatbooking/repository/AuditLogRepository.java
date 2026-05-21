package com.library.seatbooking.repository;

import com.library.seatbooking.entity.AuditLogEntity;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {
    List<AuditLogEntity> findByUser_Id(Long userId);

    List<AuditLogEntity> findByEntityType(String entityType);

    List<AuditLogEntity> findByTimestampBetween(OffsetDateTime start, OffsetDateTime end);

    List<AuditLogEntity> findByUser_IdAndEntityType(Long userId, String entityType);

    List<AuditLogEntity> findByActionContainingIgnoreCase(String action);
}
