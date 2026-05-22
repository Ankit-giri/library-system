package com.library.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@NoArgsConstructor
public class MembershipExpiryEvent extends NotificationEvent {
    private int daysUntilExpiry;
}
