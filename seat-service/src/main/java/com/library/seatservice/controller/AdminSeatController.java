package com.library.seatservice.controller;

import com.library.seatservice.dto.SeatOccupancyDTO;
import com.library.seatservice.dto.SeatMaintenanceRequest;
import com.library.seatservice.dto.SeatDTO;
import com.library.seatservice.service.SeatService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/seats")
public class AdminSeatController {

    private final SeatService seatService;

    public AdminSeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    @PutMapping("/{id}/maintenance")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeatDTO> toggleMaintenance(@PathVariable Long id,
            @RequestBody SeatMaintenanceRequest request) {
        return ResponseEntity.ok(seatService.toggleMaintenanceMode(id, request.isMaintenance()));
    }

    @GetMapping("/occupancy")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SeatOccupancyDTO>> getOccupancyHeatmap() {
        return ResponseEntity.ok(seatService.getOccupancyHeatmap());
    }
}
