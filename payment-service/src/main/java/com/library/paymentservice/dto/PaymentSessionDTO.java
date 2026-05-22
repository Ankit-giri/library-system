package com.library.paymentservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentSessionDTO {
    private String sessionId;
    private int amount;
    private String plan;
    private int expiresIn;
}
