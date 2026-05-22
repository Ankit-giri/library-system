package com.library.seatservice.service;

import com.library.seatservice.entity.BookingEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class BookingNotificationService {

    @Async
    public void sendBookingCreatedNotification(BookingEntity booking) {
        // Placeholder for future integration with notification service.
        // This method is intentionally asynchronous.
        System.out.println("Booking notification queued for booking id=" + booking.getId());
    }
}
