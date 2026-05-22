package com.library.paymentservice.repository;

import com.library.paymentservice.entity.MembershipFeeEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipFeeRepository extends JpaRepository<MembershipFeeEntity, Long> {

    List<MembershipFeeEntity> findByStudentIdOrderByPaidAtDesc(String studentId);

    List<MembershipFeeEntity> findByStudentId(String studentId);
}
