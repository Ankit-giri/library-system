package com.library.seatbooking.repository;

import com.library.seatbooking.entity.FeePlanType;
import com.library.seatbooking.entity.MembershipFeeEntity;
import com.library.seatbooking.entity.PaymentStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeeRenewalRepository extends JpaRepository<MembershipFeeEntity, Long> {
    List<MembershipFeeEntity> findByUser_Id(Long userId);

    List<MembershipFeeEntity> findByPaymentStatus(PaymentStatus paymentStatus);

    List<MembershipFeeEntity> findByPlanType(FeePlanType planType);

    List<MembershipFeeEntity> findByExpiryDateBefore(LocalDate date);

    List<MembershipFeeEntity> findByUser_IdAndPaymentStatus(Long userId, PaymentStatus paymentStatus);
}
