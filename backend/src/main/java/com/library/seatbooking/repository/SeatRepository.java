package com.library.seatbooking.repository;

import com.library.seatbooking.entity.SeatEntity;
import com.library.seatbooking.entity.SeatStatus;
import com.library.seatbooking.entity.SeatZone;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatRepository extends JpaRepository<SeatEntity, Long> {
    Optional<SeatEntity> findBySeatNumber(String seatNumber);

    List<SeatEntity> findByZone(SeatZone zone);

    List<SeatEntity> findByStatus(SeatStatus status);

    List<SeatEntity> findByZoneAndStatus(SeatZone zone, SeatStatus status);

    List<SeatEntity> findByHasPowerOutletTrue();

    List<SeatEntity> findByHasWindowTrue();
}
