package com.library.paymentservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VerifyPaymentResponse {
    private boolean success;
    private String transactionId;
    private String expiryDate;
    private String message;
}
