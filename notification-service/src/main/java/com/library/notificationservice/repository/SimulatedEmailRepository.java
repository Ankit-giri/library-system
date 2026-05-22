package com.library.notificationservice.repository;

import com.library.notificationservice.entity.SimulatedEmailEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulatedEmailRepository extends JpaRepository<SimulatedEmailEntity, Long> {
}
