package com.library.seatservice.dto;

import com.library.seatservice.entity.BookingTimeSlot;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class BookingRequest {

    @NotNull(message = "Seat ID is required")
    private Long seatId;

    @NotNull(message = "Booking date is required")
    @FutureOrPresent(message = "Booking date must be today or in the future")
    private LocalDate bookingDate;

    @NotNull(message = "Time slot is required")
    private BookingTimeSlot timeSlot;
}
