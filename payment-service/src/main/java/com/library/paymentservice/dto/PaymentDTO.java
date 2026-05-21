package com.library.paymentservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentDTO {
    private String plan;
    private int price;
    private int durationDays;
    private String description;
}
