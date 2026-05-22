package com.library.paymentservice.dto;

import java.time.LocalDate;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MembershipStatusDTO {
    private boolean active;
    private LocalDate expiryDate;
    private String plan;
}
