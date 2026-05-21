package com.library.seatservice.dto;

import com.library.seatservice.entity.SeatStatus;
import com.library.seatservice.entity.SeatZone;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SeatRequest {

    @NotBlank(message = "Seat number is required")
    @Size(max = 32, message = "Seat number must be 32 characters or fewer")
    private String seatNumber;

    @NotNull(message = "Zone is required")
    private SeatZone zone;

    @NotNull(message = "Floor is required")
    @Min(value = 1, message = "Floor must be greater than or equal to 1")
    private Integer floor;

    @NotNull(message = "Status is required")
    private SeatStatus status;

    @NotNull(message = "Power outlet flag is required")
    private Boolean hasPowerOutlet;

    @NotNull(message = "Window flag is required")
    private Boolean hasWindow;
}
