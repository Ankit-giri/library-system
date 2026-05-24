package com.library.paymentservice.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipPlanDTO {
    private Long id;
    private String name;
    private String displayName;
    private BigDecimal price;
    private int durationDays;
    private String description;
    private List<String> features;
    private String badgeText;
    private boolean featured;
    private boolean active;
}
