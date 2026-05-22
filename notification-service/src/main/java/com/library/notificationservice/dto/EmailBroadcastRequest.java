package com.library.notificationservice.dto;

import lombok.Data;

@Data
public class EmailBroadcastRequest {
    private String subject;
    private String message;
}
