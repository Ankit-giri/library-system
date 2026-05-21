package com.library.paymentservice.dto;

import java.math.BigDecimal;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentStatsDTO {
    private Map<String, Map<String, BigDecimal>> revenueByMonthByPlan;
    private BigDecimal totalRevenue;
}
