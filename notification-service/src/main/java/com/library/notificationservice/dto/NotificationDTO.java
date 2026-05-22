package com.library.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private String userId;
    private String title;
    private String message;
    private String type;
    private String channel;
    private Boolean read;
    private OffsetDateTime createdAt;
    private OffsetDateTime readAt;
}
