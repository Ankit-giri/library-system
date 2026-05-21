package com.library.seatservice.dto;

import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookingReportResponse {
    private LocalDate from;
    private LocalDate to;
    private long totalBookings;
    private long totalActive;
    private long totalCancelled;
    private long totalCompleted;
    private List<BookingZoneSummary> byZone;
    private List<BookingSlotSummary> bySlot;
    private List<BookingPeakDay> peakDays;

    @Data
    @Builder
    public static class BookingZoneSummary {
        private String zone;
        private long count;
    }

    @Data
    @Builder
    public static class BookingSlotSummary {
        private String slot;
        private long count;
    }

    @Data
    @Builder
    public static class BookingPeakDay {
        private LocalDate date;
        private long count;
    }
}
