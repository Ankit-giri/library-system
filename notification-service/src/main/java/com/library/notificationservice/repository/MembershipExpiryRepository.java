package com.library.notificationservice.repository;

import com.library.notificationservice.entity.MembershipExpiryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MembershipExpiryRepository extends JpaRepository<MembershipExpiryEntity, Long> {
    List<MembershipExpiryEntity> findByExpiryDate(LocalDate expiryDate);
}
