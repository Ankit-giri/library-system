package com.library.seatservice.controller;

import com.library.seatservice.dto.BookingOverrideRequest;
import com.library.seatservice.dto.BookingReportResponse;
import com.library.seatservice.dto.BookingResponse;
import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.SeatZone;
import com.library.seatservice.service.BookingService;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/bookings")
public class AdminBookingController {

    private final BookingService bookingService;

    public AdminBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<BookingResponse>> getBookings(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        BookingStatus bookingStatus = status != null ? BookingStatus.valueOf(status.toUpperCase()) : null;
        SeatZone seatZone = zone != null ? SeatZone.valueOf(zone.toUpperCase()) : null;
        return ResponseEntity.ok(bookingService.getAllBookings(date, bookingStatus, seatZone, studentId,
                PageRequest.of(page, size)));
    }

    @GetMapping("/recent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<BookingResponse>> getRecentBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        return ResponseEntity.ok(bookingService.getAllBookings(null, null, null, null,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "bookingDate"))));
    }

    @PutMapping("/{id}/override")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingResponse> overrideBooking(@PathVariable Long id,
            @RequestBody BookingOverrideRequest request) {
        return ResponseEntity.ok(bookingService.forceCancelBooking(id, request.getReason()));
    }

    @GetMapping("/reports")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingReportResponse> getBookingReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(bookingService.getBookingReport(from, to));
    }

    @GetMapping("/reports/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportBookings(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String month) {
        if (!"csv".equalsIgnoreCase(format)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Only csv format is supported");
        }
        String csv = bookingService.exportBookingsCsv(month);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=bookings-export.csv");
        return new ResponseEntity<>(csv, headers, HttpStatus.OK);
    }
}
