package com.library.seatservice.dto;

import com.library.seatservice.entity.SeatStatus;
import com.library.seatservice.entity.SeatZone;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SeatDTO {
    private Long id;
    private String seatNumber;
    private SeatZone zone;
    private Integer floor;
    private SeatStatus status;
    private Boolean hasPowerOutlet;
    private Boolean hasWindow;
    private String currentOccupancy;
}
