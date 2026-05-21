package com.library.seatbooking.repository;

import com.library.seatbooking.entity.BookingEntity;
import com.library.seatbooking.entity.BookingStatus;
import com.library.seatbooking.entity.BookingTimeSlot;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<BookingEntity, Long> {
    List<BookingEntity> findByUser_Id(Long userId);

    List<BookingEntity> findBySeat_Id(Long seatId);

    List<BookingEntity> findByBookingDate(LocalDate bookingDate);

    List<BookingEntity> findByStatus(BookingStatus status);

    List<BookingEntity> findByUser_IdAndStatus(Long userId, BookingStatus status);

    List<BookingEntity> findByBookingDateAndTimeSlot(LocalDate bookingDate, BookingTimeSlot timeSlot);

    List<BookingEntity> findByBookingDateAfterAndStatus(LocalDate date, BookingStatus status);

    List<BookingEntity> findByUser_IdOrderByBookingDateAscTimeSlotAsc(Long userId);
}
