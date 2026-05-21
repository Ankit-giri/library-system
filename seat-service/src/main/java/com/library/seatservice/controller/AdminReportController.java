package com.library.seatservice.controller;

import com.library.seatservice.dto.BookingReportResponse;
import com.library.seatservice.service.BookingService;
import java.time.LocalDate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {

    private final BookingService bookingService;

    public AdminReportController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/bookings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingReportResponse> getBookingReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(bookingService.getBookingReport(from, to));
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportBookings(
            @RequestParam String type,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String month) {
        if (!"bookings".equalsIgnoreCase(type)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Only bookings export is supported");
        }
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
