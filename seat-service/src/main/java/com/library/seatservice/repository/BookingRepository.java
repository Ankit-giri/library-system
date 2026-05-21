package com.library.seatservice.repository;

import com.library.seatservice.entity.BookingEntity;
import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.BookingTimeSlot;
import com.library.seatservice.entity.SeatZone;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<BookingEntity, Long> {

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

        @Query("SELECT b FROM BookingEntity b JOIN b.seat s"
                        + " WHERE (:fromDate IS NULL OR b.bookingDate >= :fromDate)"
                        + " AND (:toDate IS NULL OR b.bookingDate <= :toDate)"
                        + " AND (:status IS NULL OR b.status = :status)"
                        + " AND (:zone IS NULL OR s.zone = :zone)"
                        + " AND (:studentId IS NULL OR b.studentId = :studentId)")
        List<BookingEntity> findByFiltersForReport(@Param("fromDate") LocalDate fromDate,
                        @Param("toDate") LocalDate toDate,
                        @Param("status") BookingStatus status,
                        @Param("zone") SeatZone zone,
                        @Param("studentId") String studentId);

        List<BookingEntity> findByBookingDateAndStatus(LocalDate bookingDate, BookingStatus status);

        List<BookingEntity> findBySeat_IdAndBookingDateAndStatus(Long seatId, LocalDate bookingDate,
                        BookingStatus status);

        List<BookingEntity> findByBookingDateBeforeAndStatus(LocalDate bookingDate, BookingStatus status);

        @Query("SELECT b FROM BookingEntity b JOIN b.seat s"
                        + " WHERE (:date IS NULL OR b.bookingDate = :date)"
                        + " AND (:status IS NULL OR b.status = :status)"
                        + " AND (:zone IS NULL OR s.zone = :zone)"
                        + " AND (:studentId IS NULL OR b.studentId = :studentId)")
        Page<BookingEntity> findByFilters(@Param("date") LocalDate date,
                        @Param("status") BookingStatus status,
                        @Param("zone") SeatZone zone,
                        @Param("studentId") String studentId,
                        Pageable pageable);
}
