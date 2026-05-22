package com.library.seatservice.dto;

import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookingSummaryResponse {
    private long totalBookings;
    private long activeBookings;
    private long cancelledBookings;
    private long completedBookings;
    private Map<String, Long> bookingsByZone;
}
