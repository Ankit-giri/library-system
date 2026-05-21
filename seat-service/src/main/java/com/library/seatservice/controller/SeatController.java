package com.library.seatservice.controller;

import com.library.seatservice.dto.SeatDTO;
import com.library.seatservice.dto.SeatRequest;
import com.library.seatservice.dto.SeatStatusUpdateRequest;
import com.library.seatservice.entity.BookingTimeSlot;
import com.library.seatservice.entity.SeatStatus;
import com.library.seatservice.entity.SeatZone;
import com.library.seatservice.service.SeatService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
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
@RequestMapping("/api/seats")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    @GetMapping
    public ResponseEntity<List<SeatDTO>> listSeats(
            @RequestParam(required = false) SeatZone zone,
            @RequestParam(required = false) SeatStatus status,
            @RequestParam(required = false) Integer floor) {
        return ResponseEntity.ok(seatService.getAllSeats(zone, status, floor));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SeatDTO> getSeat(@PathVariable Long id) {
        return ResponseEntity.ok(seatService.getSeatById(id));
    }

    @GetMapping("/availability")
    public ResponseEntity<List<SeatDTO>> getAvailability(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam BookingTimeSlot slot,
            @RequestParam(required = false) SeatZone zone) {
        return ResponseEntity.ok(seatService.getAvailableSeats(date, slot, zone));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeatDTO> createSeat(@Valid @RequestBody SeatRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(seatService.createSeat(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeatDTO> updateSeat(@PathVariable Long id, @Valid @RequestBody SeatRequest request) {
        return ResponseEntity.ok(seatService.updateSeat(id, request));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeatDTO> updateStatus(@PathVariable Long id,
            @Valid @RequestBody SeatStatusUpdateRequest request) {
        return ResponseEntity.ok(seatService.updateSeatStatus(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteSeat(@PathVariable Long id) {
        seatService.softDeleteSeat(id);
        return ResponseEntity.noContent().build();
    }
}
