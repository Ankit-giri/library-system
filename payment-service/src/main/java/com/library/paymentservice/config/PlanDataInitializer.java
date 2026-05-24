package com.library.paymentservice.config;

import com.library.paymentservice.entity.MembershipPlanEntity;
import com.library.paymentservice.repository.MembershipPlanRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class PlanDataInitializer implements ApplicationRunner {

    private final MembershipPlanRepository planRepository;

    public PlanDataInitializer(MembershipPlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (planRepository.count() > 0) return;

        planRepository.saveAll(List.of(
            build("WEEKLY",    "Weekly",    79,   7,   false, null,
                  "Weekly membership plan for short-term access.",
                  "7 days full access,Seat booking,Digital resources"),
            build("MONTHLY",   "Monthly",   199,  30,  false, null,
                  "Monthly membership plan with full access to library seats.",
                  "30 days full access,Seat booking,Digital resources"),
            build("QUARTERLY", "Quarterly", 549,  90,  true,  "Best Value",
                  "Three-month membership plan with discounted rate.",
                  "90 days full access,Seat booking,Digital resources,Priority support"),
            build("YEARLY",    "Yearly",    1999, 365, false, null,
                  "Annual membership plan with maximum savings and priority booking.",
                  "365 days full access,Seat booking,Digital resources,Priority support,Exclusive study rooms")
        ));
    }

    private MembershipPlanEntity build(String name, String displayName, int price, int days,
                                       boolean featured, String badgeText,
                                       String description, String featuresCsv) {
        return MembershipPlanEntity.builder()
                .name(name)
                .displayName(displayName)
                .price(BigDecimal.valueOf(price))
                .durationDays(days)
                .featured(featured)
                .badgeText(badgeText)
                .description(description)
                .featuresCsv(featuresCsv)
                .active(true)
                .build();
    }
}
