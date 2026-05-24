package com.library.adminservice.repository;

import com.library.adminservice.entity.UserEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    @Query("SELECT u FROM UserEntity u WHERE u.deleted = false AND u.role = 'STUDENT'"
            + " AND (:search IS NULL OR u.fullName LIKE %:search% OR u.studentId LIKE %:search%"
            + "     OR u.email LIKE %:search%)"
            + " AND (:active IS NULL OR u.isActive = :active)")
    Page<UserEntity> searchActiveStudents(@Param("search") String search, @Param("active") Boolean active,
            Pageable pageable);

    @Query("SELECT u FROM UserEntity u WHERE u.deleted = false AND u.role = 'ADMIN'")
    List<UserEntity> findAllAdmins();

    long countByDeletedFalseAndRole(com.library.adminservice.entity.UserRole role);

    long countByDeletedFalse();

    Optional<UserEntity> findByIdAndDeletedFalse(Long id);
}
