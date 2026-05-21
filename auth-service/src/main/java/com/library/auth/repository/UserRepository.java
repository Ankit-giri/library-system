package com.library.auth.repository;

import com.library.auth.entity.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findByStudentId(String studentId);

    boolean existsByEmail(String email);

    boolean existsByStudentId(String studentId);

    @Query("SELECT u FROM UserEntity u WHERE u.deleted = false"
            + " AND (:search IS NULL OR u.fullName LIKE %:search% OR u.studentId LIKE %:search%)"
            + " AND (:active IS NULL OR u.isActive = :active)")
    Page<UserEntity> searchActiveStudents(@Param("search") String search, @Param("active") Boolean active,
            Pageable pageable);

    long countByDeletedFalse();

    long countByDeletedFalseAndIsActiveTrue();

    Optional<UserEntity> findByIdAndDeletedFalse(Long id);
}
