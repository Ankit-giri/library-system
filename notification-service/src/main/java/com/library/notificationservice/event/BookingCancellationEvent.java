package com.library.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@NoArgsConstructor
public class BookingCancellationEvent extends NotificationEvent {
    private String bookingReference;
    private String reason;
}
