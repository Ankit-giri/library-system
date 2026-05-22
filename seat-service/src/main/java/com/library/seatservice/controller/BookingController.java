package com.library.seatservice.controller;

import com.library.seatservice.dto.BookingRequest;
import com.library.seatservice.dto.BookingResponse;
import com.library.seatservice.dto.BookingSummaryResponse;
import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.BookingTimeSlot;
import com.library.seatservice.entity.SeatZone;
import com.library.seatservice.service.BookingService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody BookingRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingService.createBooking(request, authentication));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<BookingResponse>> getMyBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) BookingStatus status,
            Authentication authentication) {
        return ResponseEntity.ok(bookingService.getBookingHistory(authentication, status,
                PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','ADMIN')")
    public ResponseEntity<BookingResponse> getBooking(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(bookingService.getBookingById(id, authentication));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<BookingResponse> cancelBooking(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, authentication));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<BookingResponse>> getAllBookings(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) SeatZone zone,
            @RequestParam(required = false) String studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookingService.getAllBookings(date, status, zone, studentId,
                PageRequest.of(page, size)));
    }

    @GetMapping("/today")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingSummaryResponse> getTodaySummary() {
        return ResponseEntity.ok(bookingService.getTodayBookingSummary());
    }
}
