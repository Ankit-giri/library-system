package com.library.seatbooking.repository;

import com.library.seatbooking.entity.UserEntity;
import com.library.seatbooking.entity.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findByStudentId(String studentId);

    List<UserEntity> findByRole(UserRole role);

    List<UserEntity> findByIsActiveTrue();

    boolean existsByEmail(String email);

    boolean existsByStudentId(String studentId);
}
