package com.library.seatservice.repository;

import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.BookingTimeSlot;
import com.library.seatservice.entity.SeatEntity;
import com.library.seatservice.entity.SeatStatus;
import com.library.seatservice.entity.SeatZone;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SeatRepository extends JpaRepository<SeatEntity, Long> {

    @Query("SELECT s FROM SeatEntity s WHERE s.deleted = false"
            + " AND (:zone IS NULL OR s.zone = :zone)"
            + " AND (:status IS NULL OR s.status = :status)"
            + " AND (:floor IS NULL OR s.floor = :floor)")
    List<SeatEntity> findAllActiveWithFilters(@Param("zone") SeatZone zone,
            @Param("status") SeatStatus status,
            @Param("floor") Integer floor);

    @Query("SELECT s FROM SeatEntity s WHERE s.deleted = false"
            + " AND s.status <> com.library.seatservice.entity.SeatStatus.MAINTENANCE"
            + " AND s.status <> com.library.seatservice.entity.SeatStatus.UNAVAILABLE"
            + " AND (:zone IS NULL OR s.zone = :zone)"
            + " AND s.id NOT IN (SELECT b.seat.id FROM BookingEntity b"
            + " WHERE b.bookingDate = :date AND b.timeSlot = :slot AND b.status = :status)")
    List<SeatEntity> findAvailableSeats(@Param("zone") SeatZone zone,
            @Param("date") LocalDate date,
            @Param("slot") BookingTimeSlot slot,
            @Param("status") BookingStatus status);

    @Query("SELECT s.zone, s.status, COUNT(s) FROM SeatEntity s WHERE s.deleted = false GROUP BY s.zone, s.status")
    List<Object[]> countByZoneAndStatus();

    boolean existsBySeatNumberAndDeletedFalse(String seatNumber);

    java.util.Optional<SeatEntity> findByIdAndDeletedFalse(Long id);
}
