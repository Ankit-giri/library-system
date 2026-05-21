package com.library.seatservice.dto;

import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.BookingTimeSlot;
import com.library.seatservice.entity.SeatZone;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
@Builder
public class BookingResponse {
    private Long id;
    private Long userId;
    private String userEmail;
    private String studentId;
    private Long seatId;
    private String seatNumber;
    private SeatZone zone;
    private Integer floor;
    private BookingStatus status;
    private LocalDate bookingDate;
    private BookingTimeSlot timeSlot;
    private OffsetDateTime createdAt;
    private OffsetDateTime cancelledAt;
    private String adminCancelReason;
}
