package com.library.seatservice.controller;

import com.library.seatservice.dto.SeatDTO;
import com.library.seatservice.dto.SeatMaintenanceRequest;
import com.library.seatservice.dto.SeatOccupancyDTO;
import com.library.seatservice.dto.SeatRequest;
import com.library.seatservice.dto.SeatStatusUpdateRequest;
import com.library.seatservice.entity.SeatStatus;
import com.library.seatservice.entity.SeatZone;
import com.library.seatservice.service.SeatService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/seats")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSeatController {

    private final SeatService seatService;

    public AdminSeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    @GetMapping
    public ResponseEntity<List<SeatDTO>> listSeats(
            @RequestParam(required = false) SeatZone zone,
            @RequestParam(required = false) SeatStatus status,
            @RequestParam(required = false) Integer floor) {
        return ResponseEntity.ok(seatService.getAllSeats(zone, status, floor));
    }

    @PostMapping
    public ResponseEntity<SeatDTO> createSeat(@Valid @RequestBody SeatRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(seatService.createSeat(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SeatDTO> updateSeat(@PathVariable Long id, @Valid @RequestBody SeatRequest request) {
        return ResponseEntity.ok(seatService.updateSeat(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<SeatDTO> updateStatus(@PathVariable Long id,
            @Valid @RequestBody SeatStatusUpdateRequest request) {
        return ResponseEntity.ok(seatService.updateSeatStatus(id, request));
    }

    @PutMapping("/{id}/maintenance")
    public ResponseEntity<SeatDTO> toggleMaintenance(@PathVariable Long id,
            @RequestBody SeatMaintenanceRequest request) {
        return ResponseEntity.ok(seatService.toggleMaintenanceMode(id, request.isMaintenance()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSeat(@PathVariable Long id) {
        seatService.softDeleteSeat(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/occupancy")
    public ResponseEntity<List<SeatOccupancyDTO>> getOccupancyHeatmap() {
        return ResponseEntity.ok(seatService.getOccupancyHeatmap());
    }
}
