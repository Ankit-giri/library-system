package com.library.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@NoArgsConstructor
public class PaymentFailureEvent extends NotificationEvent {
    private String paymentReference;
    private String amount;
    private String failureReason;
}
