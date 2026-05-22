package com.library.studentservice.dto;

import java.time.OffsetDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentProfileDTO {
    private Long id;
    private String studentId;
    private String fullName;
    private String email;
    private String role;
    private Boolean active;
    private OffsetDateTime createdAt;
}
