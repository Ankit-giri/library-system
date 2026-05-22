package com.library.adminservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookingHistoryDTO {
    private Long id;
    private String userEmail;
    private String studentId;
    private Long seatId;
    private String seatNumber;
    private String zone;
    private Integer floor;
    private String status;
    private String bookingDate;
    private String timeSlot;
}
