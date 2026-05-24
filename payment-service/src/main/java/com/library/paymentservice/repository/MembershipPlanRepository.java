package com.library.paymentservice.repository;

import com.library.paymentservice.entity.MembershipPlanEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipPlanRepository extends JpaRepository<MembershipPlanEntity, Long> {

    List<MembershipPlanEntity> findByActiveTrueOrderByPriceAsc();

    Optional<MembershipPlanEntity> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}
