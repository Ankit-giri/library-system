package com.library.paymentservice.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentsResponseDTO {
    private List<PaymentHistoryDTO> payments;
    private BigDecimal totalRevenue;
}
