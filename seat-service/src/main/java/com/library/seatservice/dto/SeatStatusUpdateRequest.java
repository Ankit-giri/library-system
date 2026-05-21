package com.library.seatservice.dto;

import com.library.seatservice.entity.SeatStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SeatStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private SeatStatus status;
}
