package com.library.paymentservice.dto;

import java.math.BigDecimal;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RevenueReportDTO {
    private String month;
    private BigDecimal totalRevenue;
    private long totalTransactions;
    private Map<String, BigDecimal> revenueByPlan;
    private Map<String, BigDecimal> dailyBreakdown;
}
