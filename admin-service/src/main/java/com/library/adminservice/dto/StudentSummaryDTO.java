package com.library.adminservice.dto;

import java.time.OffsetDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentSummaryDTO {
    private Long id;
    private String studentId;
    private String fullName;
    private String email;
    private Boolean active;
    private OffsetDateTime createdAt;
}
