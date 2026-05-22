package com.library.paymentservice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentHistoryDTO {
    private String transactionId;
    private String plan;
    private BigDecimal amount;
    private String cardLastFour;
    private LocalDate expiryDate;
    private OffsetDateTime paidAt;
}
