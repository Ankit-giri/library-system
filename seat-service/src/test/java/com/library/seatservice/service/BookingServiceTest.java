package com.library.seatservice.service;

import com.library.seatservice.dto.BookingRequest;
import com.library.seatservice.dto.BookingResponse;
import com.library.seatservice.entity.BookingEntity;
import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.BookingTimeSlot;
import com.library.seatservice.entity.SeatEntity;
import com.library.seatservice.entity.SeatStatus;
import com.library.seatservice.entity.SeatZone;
import com.library.seatservice.exception.ResourceNotFoundException;
import com.library.seatservice.external.PaymentClient;
import com.library.seatservice.repository.BookingRepository;
import com.library.seatservice.repository.SeatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BookingService unit tests")
@SuppressWarnings("null")   // Mockito thenReturn() is safe; @NonNull warnings are false positives here
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private SeatRepository seatRepository;

    @Mock
    private PaymentClient paymentClient;

    @Mock
    private BookingNotificationService bookingNotificationService;

    @InjectMocks
    private BookingService bookingService;

    // ── Shared fixtures ────────────────────────────────────────────────────────

    private static final String USER_EMAIL = "student@library.com";
    private static final Long   SEAT_ID    = 1L;
    private static final Long   BOOKING_ID = 10L;

    /** A seat that is AVAILABLE and not deleted. */
    private SeatEntity availableSeat;

    /** A booking request for a date safely in the future (no flakiness risk). */
    private BookingRequest futureRequest;

    /** Spring Security Authentication whose principal is a UserDetails for USER_EMAIL. */
    private Authentication auth;

    @BeforeEach
    void setUp() {
        availableSeat = SeatEntity.builder()
                .id(SEAT_ID)
                .seatNumber("A-01")
                .zone(SeatZone.QUIET)
                .floor(1)
                .status(SeatStatus.AVAILABLE)
                .deleted(false)
                .build();

        futureRequest = new BookingRequest();
        futureRequest.setSeatId(SEAT_ID);
        futureRequest.setBookingDate(LocalDate.now().plusDays(3));
        futureRequest.setTimeSlot(BookingTimeSlot.MORNING);

        UserDetails userDetails = User.withUsername(USER_EMAIL)
                .password("irrelevant")
                .roles("STUDENT")
                .build();

        auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn(userDetails);
    }

    // ── createBooking ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("createBooking — happy path saves booking and returns response")
    void testCreateBooking_Success() {
        // Arrange
        when(seatRepository.findByIdAndDeletedFalse(SEAT_ID)).thenReturn(Optional.of(availableSeat));

        // seat is not already booked for the slot
        when(bookingRepository.existsBySeat_IdAndBookingDateAndTimeSlotAndStatus(
                eq(SEAT_ID), eq(futureRequest.getBookingDate()),
                eq(BookingTimeSlot.MORNING), eq(BookingStatus.ACTIVE)))
                .thenReturn(false);

        // student membership is active
        when(paymentClient.isMembershipActive(USER_EMAIL)).thenReturn(true);

        // student has no conflicting booking in the same slot
        when(bookingRepository.existsByUserEmailAndBookingDateAndTimeSlotAndStatus(
                eq(USER_EMAIL), eq(futureRequest.getBookingDate()),
                eq(BookingTimeSlot.MORNING), eq(BookingStatus.ACTIVE)))
                .thenReturn(false);

        BookingEntity savedEntity = BookingEntity.builder()
                .id(BOOKING_ID)
                .userEmail(USER_EMAIL)
                .studentId(USER_EMAIL)        // resolveCurrentStudentId returns username
                .seat(availableSeat)
                .bookingDate(futureRequest.getBookingDate())
                .timeSlot(BookingTimeSlot.MORNING)
                .status(BookingStatus.ACTIVE)
                .build();

        when(bookingRepository.save(any(BookingEntity.class))).thenReturn(savedEntity);

        // Act
        BookingResponse response = bookingService.createBooking(futureRequest, auth);

        // Assert — response fields
        assertThat(response.getId()).isEqualTo(BOOKING_ID);
        assertThat(response.getUserEmail()).isEqualTo(USER_EMAIL);
        assertThat(response.getStatus()).isEqualTo(BookingStatus.ACTIVE);
        assertThat(response.getSeatNumber()).isEqualTo("A-01");

        // Assert — collaboration
        verify(bookingRepository).save(any(BookingEntity.class));
        verify(bookingNotificationService).sendBookingCreatedNotification(any(BookingEntity.class));
    }

    @Test
    @DisplayName("createBooking — seat already booked for the requested slot throws IllegalStateException")
    void testCreateBooking_SeatAlreadyBooked_ThrowsException() {
        // Arrange
        when(seatRepository.findByIdAndDeletedFalse(SEAT_ID)).thenReturn(Optional.of(availableSeat));
        when(bookingRepository.existsBySeat_IdAndBookingDateAndTimeSlotAndStatus(
                eq(SEAT_ID), any(), eq(BookingTimeSlot.MORNING), eq(BookingStatus.ACTIVE)))
                .thenReturn(true);   // ← seat is taken

        // Act & Assert
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> bookingService.createBooking(futureRequest, auth));

        assertThat(ex.getMessage()).contains("already booked");

        // save() must never be reached
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("createBooking — seat under maintenance throws IllegalStateException")
    void testCreateBooking_SeatUnderMaintenance_ThrowsException() {
        // Arrange — seat is in MAINTENANCE status
        SeatEntity maintenanceSeat = SeatEntity.builder()
                .id(SEAT_ID)
                .seatNumber("A-01")
                .zone(SeatZone.QUIET)
                .floor(1)
                .status(SeatStatus.MAINTENANCE)
                .deleted(false)
                .build();

        when(seatRepository.findByIdAndDeletedFalse(SEAT_ID)).thenReturn(Optional.of(maintenanceSeat));

        // Act & Assert
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> bookingService.createBooking(futureRequest, auth));

        assertThat(ex.getMessage()).contains("not available");
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("createBooking — expired membership throws IllegalStateException")
    void testCreateBooking_MembershipExpired_ThrowsException() {
        // Arrange
        when(seatRepository.findByIdAndDeletedFalse(SEAT_ID)).thenReturn(Optional.of(availableSeat));
        when(bookingRepository.existsBySeat_IdAndBookingDateAndTimeSlotAndStatus(
                any(), any(), any(), any()))
                .thenReturn(false);
        when(paymentClient.isMembershipActive(USER_EMAIL)).thenReturn(false);   // ← expired

        // Act & Assert
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> bookingService.createBooking(futureRequest, auth));

        assertThat(ex.getMessage()).contains("membership is not active");
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("createBooking — student already has a booking in the same slot throws IllegalStateException")
    void testCreateBooking_DuplicateBookingSameSlot_ThrowsException() {
        // Arrange
        when(seatRepository.findByIdAndDeletedFalse(SEAT_ID)).thenReturn(Optional.of(availableSeat));
        when(bookingRepository.existsBySeat_IdAndBookingDateAndTimeSlotAndStatus(
                any(), any(), any(), any()))
                .thenReturn(false);   // seat itself is free
        when(paymentClient.isMembershipActive(USER_EMAIL)).thenReturn(true);
        when(bookingRepository.existsByUserEmailAndBookingDateAndTimeSlotAndStatus(
                eq(USER_EMAIL), any(), eq(BookingTimeSlot.MORNING), eq(BookingStatus.ACTIVE)))
                .thenReturn(true);    // ← student already has a booking in this slot

        // Act & Assert
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> bookingService.createBooking(futureRequest, auth));

        assertThat(ex.getMessage()).contains("already have a booking");
        verify(bookingRepository, never()).save(any());
    }

    // ── cancelBooking ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("cancelBooking — happy path marks booking CANCELLED")
    void testCancelBooking_Success() {
        // Arrange — booking date is 2 days away; cancellation window is open
        BookingEntity booking = BookingEntity.builder()
                .id(BOOKING_ID)
                .userEmail(USER_EMAIL)
                .seat(availableSeat)
                .bookingDate(LocalDate.now().plusDays(2))   // well outside 1-hour window
                .timeSlot(BookingTimeSlot.MORNING)
                .status(BookingStatus.ACTIVE)
                .build();

        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));

        BookingEntity cancelledEntity = BookingEntity.builder()
                .id(BOOKING_ID)
                .userEmail(USER_EMAIL)
                .seat(availableSeat)
                .bookingDate(booking.getBookingDate())
                .timeSlot(BookingTimeSlot.MORNING)
                .status(BookingStatus.CANCELLED)
                .build();

        when(bookingRepository.save(any(BookingEntity.class))).thenReturn(cancelledEntity);

        // Act
        BookingResponse response = bookingService.cancelBooking(BOOKING_ID, auth);

        // Assert
        assertThat(response.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(bookingRepository).save(any(BookingEntity.class));
    }

    @Test
    @DisplayName("cancelBooking — within 1-hour window throws IllegalStateException")
    void testCancelBooking_PastCancellationWindow_ThrowsException() {
        // Arrange — booking is from yesterday: the 1-hour cutoff is entirely in the past
        BookingEntity booking = BookingEntity.builder()
                .id(BOOKING_ID)
                .userEmail(USER_EMAIL)
                .seat(availableSeat)
                .bookingDate(LocalDate.now().minusDays(1))  // yesterday → window has closed
                .timeSlot(BookingTimeSlot.MORNING)
                .status(BookingStatus.ACTIVE)
                .build();

        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));

        // Act & Assert
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> bookingService.cancelBooking(BOOKING_ID, auth));

        assertThat(ex.getMessage()).contains("less than 1 hour");
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("cancelBooking — booking not found throws ResourceNotFoundException")
    void testCancelBooking_BookingNotFound_ThrowsException() {
        // Arrange
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceNotFoundException ex = assertThrows(
                ResourceNotFoundException.class,
                () -> bookingService.cancelBooking(BOOKING_ID, auth));

        assertThat(ex.getMessage()).contains(String.valueOf(BOOKING_ID));
        verify(bookingRepository, never()).save(any());
    }
}
