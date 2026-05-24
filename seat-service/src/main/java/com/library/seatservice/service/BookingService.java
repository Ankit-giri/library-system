package com.library.seatservice.service;

import com.library.seatservice.dto.BookingRequest;
import com.library.seatservice.dto.BookingResponse;
import com.library.seatservice.dto.BookingReportResponse;
import com.library.seatservice.dto.BookingSummaryResponse;
import com.library.seatservice.entity.BookingEntity;
import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.BookingTimeSlot;
import com.library.seatservice.entity.SeatEntity;
import com.library.seatservice.entity.SeatStatus;
import com.library.seatservice.entity.SeatZone;
import com.library.seatservice.external.PaymentClient;
import com.library.seatservice.exception.ResourceNotFoundException;
import com.library.seatservice.repository.BookingRepository;
import com.library.seatservice.repository.BookingSpecifications;
import com.library.seatservice.repository.SeatRepository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.scheduling.annotation.Scheduled;

@Service
@SuppressWarnings("null")
public class BookingService {

    private final BookingRepository bookingRepository;
    private final SeatRepository seatRepository;
    private final PaymentClient paymentClient;
    private final BookingNotificationService bookingNotificationService;

    public BookingService(BookingRepository bookingRepository,
            SeatRepository seatRepository,
            PaymentClient paymentClient,
            BookingNotificationService bookingNotificationService) {
        this.bookingRepository = bookingRepository;
        this.seatRepository = seatRepository;
        this.paymentClient = paymentClient;
        this.bookingNotificationService = bookingNotificationService;
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public BookingResponse createBooking(BookingRequest request, Authentication authentication) {
        String userEmail = resolveCurrentUserEmail(authentication);
        String studentId = resolveCurrentStudentId(authentication);
        Long userId = resolveCurrentUserId(authentication);
        String userName = resolveCurrentUserName(authentication);
        SeatEntity seat = seatRepository.findByIdAndDeletedFalse(request.getSeatId())
                .orElseThrow(() -> new ResourceNotFoundException("Seat not found with id " + request.getSeatId()));

        validateBookingDateCutoff(request.getBookingDate());
        validateSeatAvailableForBooking(seat, request.getBookingDate(), request.getTimeSlot());
        validateStudentMembership(studentId != null ? studentId : userEmail);
        validateStudentBookingConflict(userEmail, request.getBookingDate(), request.getTimeSlot());

        BookingEntity booking = BookingEntity.builder()
                .userId(userId)
                .userEmail(userEmail)
                .studentId(studentId)
                .userName(userName)
                .seat(seat)
                .bookingDate(request.getBookingDate())
                .timeSlot(request.getTimeSlot())
                .status(BookingStatus.ACTIVE)
                .build();

        BookingEntity saved = bookingRepository.save(booking);
        bookingNotificationService.sendBookingCreatedNotification(saved);
        return toResponse(saved);
    }

    public Page<BookingResponse> getBookingHistory(Authentication authentication, BookingStatus status,
            Pageable pageable) {
        String userEmail = resolveCurrentUserEmail(authentication);
        Page<BookingEntity> page;
        if (status != null) {
            page = bookingRepository.findByUserEmailAndStatus(userEmail, status, pageable);
        } else {
            page = bookingRepository.findByUserEmail(userEmail, pageable);
        }
        return page.map(this::toResponse);
    }

    public BookingResponse getBookingById(Long bookingId, Authentication authentication) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id " + bookingId));
        authorizeBookingAccess(booking, authentication);
        return toResponse(booking);
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public BookingResponse cancelBooking(Long bookingId, Authentication authentication) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id " + bookingId));
        authorizeBookingAccess(booking, authentication);
        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw new IllegalStateException("Only active bookings can be cancelled");
        }
        if (!canCancelBooking(booking)) {
            throw new IllegalStateException("Booking cannot be cancelled less than 1 hour before the slot starts");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        if (booking.getSeat().getStatus() == SeatStatus.OCCUPIED) {
            booking.getSeat().setStatus(SeatStatus.AVAILABLE);
            seatRepository.save(booking.getSeat());
        }
        BookingEntity updated = bookingRepository.save(booking);
        return toResponse(updated);
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public BookingResponse forceCancelBooking(Long bookingId, String reason) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id " + bookingId));
        if (booking.getStatus() != BookingStatus.CANCELLED) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(OffsetDateTime.now());
            booking.setAdminCancelReason(reason);
            if (booking.getSeat().getStatus() == SeatStatus.OCCUPIED) {
                booking.getSeat().setStatus(SeatStatus.AVAILABLE);
                seatRepository.save(booking.getSeat());
            }
            bookingRepository.save(booking);
        }
        return toResponse(booking);
    }

    public BookingReportResponse getBookingReport(LocalDate from, LocalDate to) {
        List<BookingEntity> bookings = bookingRepository.findByDateRange(from, to);
        long total = bookings.size();
        long active = bookings.stream().filter(b -> b.getStatus() == BookingStatus.ACTIVE).count();
        long cancelled = bookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();
        long completed = bookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
        List<BookingReportResponse.BookingZoneSummary> byZone = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getSeat().getZone().name(), Collectors.counting()))
                .entrySet().stream()
                .map(entry -> BookingReportResponse.BookingZoneSummary.builder()
                        .zone(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .toList();
        List<BookingReportResponse.BookingSlotSummary> bySlot = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getTimeSlot().name(), Collectors.counting()))
                .entrySet().stream()
                .map(entry -> BookingReportResponse.BookingSlotSummary.builder()
                        .slot(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .toList();
        List<BookingReportResponse.BookingPeakDay> peakDays = bookings.stream()
                .collect(Collectors.groupingBy(BookingEntity::getBookingDate, Collectors.counting()))
                .entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(entry -> BookingReportResponse.BookingPeakDay.builder()
                        .date(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .toList();
        return BookingReportResponse.builder()
                .from(from)
                .to(to)
                .totalBookings(total)
                .totalActive(active)
                .totalCancelled(cancelled)
                .totalCompleted(completed)
                .byZone(byZone)
                .bySlot(bySlot)
                .peakDays(peakDays)
                .build();
    }

    public String exportBookingsCsv(String month) {
        List<BookingEntity> all = bookingRepository.findAll();
        List<BookingEntity> bookings = month != null
                ? all.stream().filter(b -> b.getBookingDate().toString().startsWith(month)).toList()
                : all;
        StringBuilder csv = new StringBuilder(
                "BookingId,StudentId,UserEmail,SeatNumber,Zone,Date,Slot,Status,CancelledAt,AdminCancelReason\n");
        bookings.forEach(booking -> csv.append(String.format("%d,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                booking.getId(),
                booking.getStudentId(),
                booking.getUserEmail(),
                booking.getSeat().getSeatNumber(),
                booking.getSeat().getZone(),
                booking.getBookingDate(),
                booking.getTimeSlot(),
                booking.getStatus(),
                booking.getCancelledAt() != null ? booking.getCancelledAt() : "",
                booking.getAdminCancelReason() != null ? booking.getAdminCancelReason().replaceAll(",", " ") : "")));
        return csv.toString();
    }

    public Page<BookingResponse> getAllBookings(LocalDate dateFrom,
            LocalDate dateTo,
            BookingStatus status,
            SeatZone zone,
            String studentId,
            String search,
            Pageable pageable) {
        return bookingRepository.findAll(
                BookingSpecifications.forAdminList(dateFrom, dateTo, status, zone, studentId, search), pageable)
                .map(this::toResponse);
    }

    public BookingSummaryResponse getTodayBookingSummary() {
        LocalDate today = LocalDate.now();
        List<BookingEntity> todayBookings = bookingRepository.findByBookingDate(today);
        long total = todayBookings.size();
        long active = todayBookings.stream().filter(b -> b.getStatus() == BookingStatus.ACTIVE).count();
        long cancelled = todayBookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();
        long completed = todayBookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
        Map<String, Long> byZone = todayBookings.stream()
                .collect(Collectors.groupingBy(b -> b.getSeat().getZone().name(), Collectors.counting()));
        return BookingSummaryResponse.builder()
                .totalBookings(total)
                .activeBookings(active)
                .cancelledBookings(cancelled)
                .completedBookings(completed)
                .bookingsByZone(byZone)
                .build();
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void autoCompleteExpiredBookings() {
        LocalDate today = LocalDate.now();
        List<BookingEntity> expired = bookingRepository.findByBookingDateBeforeAndStatus(today, BookingStatus.ACTIVE);
        expired.addAll(bookingRepository.findByBookingDateAndStatus(today, BookingStatus.ACTIVE).stream()
                .filter(this::isBookingExpiredForToday)
                .collect(Collectors.toList()));
        expired.forEach(booking -> {
            booking.setStatus(BookingStatus.COMPLETED);
            if (booking.getSeat().getStatus() == SeatStatus.OCCUPIED) {
                booking.getSeat().setStatus(SeatStatus.AVAILABLE);
                seatRepository.save(booking.getSeat());
            }
        });
        bookingRepository.saveAll(expired);
    }

    private void validateBookingDateCutoff(LocalDate bookingDate) {
        if (bookingDate.equals(LocalDate.now())
                && java.time.LocalTime.now().isAfter(java.time.LocalTime.of(18, 0))) {
            throw new IllegalStateException(
                    "Bookings for today are closed after 6:00 PM. Please book for tomorrow or a future date.");
        }
    }

    private void validateSeatAvailableForBooking(SeatEntity seat, LocalDate date, BookingTimeSlot slot) {
        if (seat.getStatus() == SeatStatus.MAINTENANCE || seat.getStatus() == SeatStatus.UNAVAILABLE) {
            throw new IllegalStateException("Seat is not available for booking");
        }
        if (bookingRepository.existsBySeat_IdAndBookingDateAndTimeSlotAndStatus(seat.getId(), date, slot,
                BookingStatus.ACTIVE)) {
            throw new IllegalStateException("Seat is already booked for the requested date and slot");
        }
    }

    private void validateStudentMembership(String identifier) {
        if (!paymentClient.isMembershipActive(identifier)) {
            throw new IllegalStateException("Student membership is not active");
        }
    }

    private void validateStudentBookingConflict(String userEmail, LocalDate bookingDate, BookingTimeSlot timeSlot) {
        if (bookingRepository.existsByUserEmailAndBookingDateAndTimeSlotAndStatus(userEmail, bookingDate, timeSlot,
                BookingStatus.ACTIVE)) {
            throw new IllegalStateException("You already have a booking for the same date and slot");
        }
    }

    private boolean canCancelBooking(BookingEntity booking) {
        LocalDateTime cutoff = LocalDateTime.of(booking.getBookingDate(), booking.getTimeSlot().getStartTime())
                .minusHours(1);
        return LocalDateTime.now().isBefore(cutoff);
    }

    private boolean isBookingExpiredForToday(BookingEntity booking) {
        LocalDateTime slotEnd = LocalDateTime.of(booking.getBookingDate(), booking.getTimeSlot().getStartTime())
                .plusHours(1);
        return LocalDateTime.now().isAfter(slotEnd);
    }

    private void authorizeBookingAccess(BookingEntity booking, Authentication authentication) {
        if (isAdmin(authentication)) {
            return;
        }
        String currentUserEmail = resolveCurrentUserEmail(authentication);
        if (!booking.getUserEmail().equals(currentUserEmail)) {
            throw new AccessDeniedException("Access denied to booking");
        }
    }

    private String resolveCurrentUserEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication required");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        if (principal instanceof String name) {
            return name;
        }
        throw new IllegalStateException("Unable to resolve user email from authentication");
    }

    private String resolveCurrentStudentId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication required");
        }
        Object details = authentication.getDetails();
        if (details instanceof Map<?, ?> map) {
            Object sid = map.get("studentId");
            if (sid instanceof String s) return s;
        }
        return null;
    }

    private Long resolveCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication required");
        }
        Object details = authentication.getDetails();
        if (details instanceof Map<?, ?> map) {
            Object uid = map.get("userId");
            if (uid instanceof Number n) return n.longValue();
        }
        return null;
    }

    private String resolveCurrentUserName(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        Object details = authentication.getDetails();
        if (details instanceof Map<?, ?> map) {
            Object name = map.get("fullName");
            if (name instanceof String s) return s;
        }
        return null;
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> authority.equals("ROLE_ADMIN"));
    }

    private BookingResponse toResponse(BookingEntity booking) {
        return BookingResponse.builder()
                .id(booking.getId())
                .userEmail(booking.getUserEmail())
                .studentId(booking.getStudentId())
                .studentName(booking.getUserName())
                .seatId(booking.getSeat().getId())
                .seatNumber(booking.getSeat().getSeatNumber())
                .zone(booking.getSeat().getZone())
                .floor(booking.getSeat().getFloor())
                .status(booking.getStatus())
                .bookingDate(booking.getBookingDate())
                .timeSlot(booking.getTimeSlot())
                .createdAt(booking.getCreatedAt())
                .cancelledAt(booking.getCancelledAt())
                .adminCancelReason(booking.getAdminCancelReason())
                .build();
    }
}
