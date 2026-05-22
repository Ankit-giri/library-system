package com.library.adminservice.dto;

import java.time.OffsetDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentDetailDTO {
    private Long id;
    private String studentId;
    private String fullName;
    private String email;
    private String role;
    private Boolean active;
    private OffsetDateTime createdAt;
    private List<BookingHistoryDTO> bookingHistory;
    private List<PaymentHistorySummaryDTO> paymentHistory;
}
