package com.library.adminservice.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminDashboardDTO {
    private long totalStudents;
    private int activeBookingsToday;
    private int availableSeats;
    private int totalSeats;
    private BigDecimal monthlyRevenue;
    private int pendingRenewals;
    private List<BookingHistoryDTO> recentBookings;
    private List<PaymentHistorySummaryDTO> recentPayments;
}
