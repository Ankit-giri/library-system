package com.library.notificationservice.dto;

import java.time.OffsetDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SimulatedEmailDTO {
    private Long id;
    private String userId;
    private String recipient;
    private String subject;
    private String body;
    private String status;
    private OffsetDateTime sentAt;
}
