package com.library.seatservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SeatOccupancyDTO {
    private String zone;
    private long occupied;
    private long available;
    private long maintenance;
}
