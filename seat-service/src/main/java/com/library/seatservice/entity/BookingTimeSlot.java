package com.library.seatservice.entity;

import java.time.LocalTime;

public enum BookingTimeSlot {
    MORNING(LocalTime.of(9, 0)),
    AFTERNOON(LocalTime.of(13, 0)),
    EVENING(LocalTime.of(17, 0));

    private final LocalTime startTime;

    BookingTimeSlot(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getStartTime() {
        return startTime;
    }
}
