package com.library.paymentservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PaymentConfirmationRequest {

    @NotBlank
    private String sessionId;

    @NotBlank
    private String cardLastFour;

    @NotNull
    private Boolean simulateSuccess;
}
