package com.library.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentHistorySummaryDTO {
    private String transactionId;
    private String plan;
    private String amount;
    private String expiryDate;
    private String paidAt;
}
