package com.library.seatservice.repository;

import com.library.seatservice.entity.BookingEntity;
import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.BookingTimeSlot;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<BookingEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<BookingEntity> {

        boolean existsBySeat_IdAndBookingDateAndTimeSlotAndStatus(Long seatId,
                        LocalDate bookingDate,
                        BookingTimeSlot timeSlot,
                        BookingStatus status);

        boolean existsByUserEmailAndBookingDateAndTimeSlotAndStatus(String userEmail,
                        LocalDate bookingDate,
                        BookingTimeSlot timeSlot,
                        BookingStatus status);

        Page<BookingEntity> findByUserEmail(String userEmail, Pageable pageable);

        Page<BookingEntity> findByUserEmailAndStatus(String userEmail, BookingStatus status, Pageable pageable);

        Optional<BookingEntity> findByIdAndUserEmail(Long id, String userEmail);

        List<BookingEntity> findByBookingDate(LocalDate bookingDate);

        @Query("SELECT b FROM BookingEntity b JOIN FETCH b.seat WHERE b.bookingDate >= :fromDate AND b.bookingDate <= :toDate")
        List<BookingEntity> findByDateRange(@Param("fromDate") LocalDate fromDate,
                        @Param("toDate") LocalDate toDate);

        List<BookingEntity> findByBookingDateAndStatus(LocalDate bookingDate, BookingStatus status);

        List<BookingEntity> findBySeat_IdAndBookingDateAndStatus(Long seatId, LocalDate bookingDate,
                        BookingStatus status);

        List<BookingEntity> findByBookingDateBeforeAndStatus(LocalDate bookingDate, BookingStatus status);

        @Query("SELECT b.seat.id FROM BookingEntity b WHERE b.bookingDate = :date AND b.timeSlot = :slot AND b.status = :status")
        Set<Long> findBookedSeatIds(@Param("date") LocalDate date,
                        @Param("slot") BookingTimeSlot slot,
                        @Param("status") BookingStatus status);

        @Query("SELECT DISTINCT b.seat.id FROM BookingEntity b WHERE b.bookingDate = :date AND b.status = :status")
        Set<Long> findDistinctBookedSeatIdsByDate(@Param("date") LocalDate date,
                        @Param("status") BookingStatus status);

}
