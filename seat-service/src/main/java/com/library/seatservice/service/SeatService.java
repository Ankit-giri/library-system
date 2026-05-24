package com.library.seatservice.service;

import com.library.seatservice.dto.SeatDTO;
import com.library.seatservice.dto.SeatOccupancyDTO;
import com.library.seatservice.dto.SeatRequest;
import com.library.seatservice.dto.SeatStatusUpdateRequest;
import com.library.seatservice.entity.BookingEntity;
import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.BookingTimeSlot;
import com.library.seatservice.entity.SeatEntity;
import com.library.seatservice.entity.SeatStatus;
import com.library.seatservice.entity.SeatZone;
import com.library.seatservice.exception.ResourceNotFoundException;
import com.library.seatservice.repository.BookingRepository;
import com.library.seatservice.repository.SeatRepository;
import com.library.seatservice.util.SecurityUtil;
import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
@SuppressWarnings("null")
public class SeatService {

    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;

    public SeatService(SeatRepository seatRepository, BookingRepository bookingRepository) {
        this.seatRepository = seatRepository;
        this.bookingRepository = bookingRepository;
    }

    public List<SeatDTO> getAllSeats(SeatZone zone, SeatStatus status, Integer floor) {
        boolean adminView = SecurityUtil.isAdmin();
        return seatRepository.findAllActiveWithFilters(zone, status, floor).stream()
                .map(seat -> toDto(seat, adminView))
                .collect(Collectors.toList());
    }

    public SeatDTO getSeatById(Long id) {
        SeatEntity seat = findActiveSeat(id);
        return toDto(seat, SecurityUtil.isAdmin());
    }

    public List<SeatDTO> getAvailableSeats(LocalDate date, BookingTimeSlot slot, SeatZone zone) {
        if (date == null || slot == null) {
            throw new IllegalArgumentException("Date and slot are required to find available seats");
        }
        Set<Long> bookedIds = bookingRepository.findBookedSeatIds(date, slot, BookingStatus.ACTIVE);
        return seatRepository.findAllActiveWithFilters(zone, null, null).stream()
                .map(seat -> {
                    SeatStatus effectiveStatus = (seat.getStatus() == SeatStatus.AVAILABLE && bookedIds.contains(seat.getId()))
                            ? SeatStatus.OCCUPIED
                            : seat.getStatus();
                    return SeatDTO.builder()
                            .id(seat.getId())
                            .seatNumber(seat.getSeatNumber())
                            .zone(seat.getZone())
                            .floor(seat.getFloor())
                            .status(effectiveStatus)
                            .hasPowerOutlet(seat.getHasPowerOutlet())
                            .hasWindow(seat.getHasWindow())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public SeatDTO createSeat(SeatRequest request) {
        if (seatRepository.existsBySeatNumberAndDeletedFalse(request.getSeatNumber())) {
            throw new IllegalArgumentException("Seat number already exists");
        }
        SeatEntity seat = SeatEntity.builder()
                .seatNumber(request.getSeatNumber())
                .zone(request.getZone())
                .floor(request.getFloor())
                .status(request.getStatus())
                .hasPowerOutlet(request.getHasPowerOutlet())
                .hasWindow(request.getHasWindow())
                .deleted(false)
                .build();
        return toDto(seatRepository.save(seat), true);
    }

    @Transactional
    public SeatDTO updateSeat(Long id, SeatRequest request) {
        SeatEntity seat = findActiveSeat(id);
        if (!seat.getSeatNumber().equals(request.getSeatNumber())
                && seatRepository.existsBySeatNumberAndDeletedFalse(request.getSeatNumber())) {
            throw new IllegalArgumentException("Seat number already exists");
        }
        seat.setSeatNumber(request.getSeatNumber());
        seat.setZone(request.getZone());
        seat.setFloor(request.getFloor());
        seat.setStatus(request.getStatus());
        seat.setHasPowerOutlet(request.getHasPowerOutlet());
        seat.setHasWindow(request.getHasWindow());
        return toDto(seatRepository.save(seat), true);
    }

    @Transactional
    public SeatDTO updateSeatStatus(Long id, SeatStatusUpdateRequest request) {
        SeatEntity seat = findActiveSeat(id);
        seat.setStatus(request.getStatus());
        return toDto(seatRepository.save(seat), true);
    }

    @Transactional
    public SeatDTO toggleMaintenanceMode(Long id, boolean maintenance) {
        SeatEntity seat = findActiveSeat(id);
        seat.setStatus(maintenance ? SeatStatus.MAINTENANCE : SeatStatus.AVAILABLE);
        return toDto(seatRepository.save(seat), true);
    }

    public List<SeatOccupancyDTO> getOccupancyHeatmap() {
        LocalDate today = LocalDate.now();
        Set<Long> bookedTodayIds = bookingRepository.findDistinctBookedSeatIdsByDate(today, BookingStatus.ACTIVE);

        Map<String, long[]> counts = new LinkedHashMap<>(); // [available, occupied, maintenance]
        seatRepository.findAllActiveWithFilters(null, null, null).forEach(seat -> {
            long[] c = counts.computeIfAbsent(seat.getZone().name(), z -> new long[3]);
            if (seat.getStatus() == SeatStatus.MAINTENANCE || seat.getStatus() == SeatStatus.UNAVAILABLE) {
                c[2]++;
            } else if (bookedTodayIds.contains(seat.getId())) {
                c[1]++;
            } else {
                c[0]++;
            }
        });

        return counts.entrySet().stream()
                .map(e -> SeatOccupancyDTO.builder()
                        .zone(e.getKey())
                        .available(e.getValue()[0])
                        .occupied(e.getValue()[1])
                        .maintenance(e.getValue()[2])
                        .build())
                .toList();
    }

    @Transactional
    public void softDeleteSeat(Long id) {
        SeatEntity seat = findActiveSeat(id);
        seat.setDeleted(true);
        seatRepository.save(seat);
    }

    public boolean checkSeatAvailable(Long seatId, LocalDate date, BookingTimeSlot slot) {
        SeatEntity seat = findActiveSeat(seatId);
        if (seat.getStatus() != SeatStatus.AVAILABLE) {
            return false;
        }
        return !bookingRepository.existsBySeat_IdAndBookingDateAndTimeSlotAndStatus(
                seatId, date, slot, BookingStatus.ACTIVE);
    }

    public Map<String, Map<String, Long>> getSeatOccupancyStats() {
        Map<String, Map<String, Long>> stats = new LinkedHashMap<>();
        seatRepository.countByZoneAndStatus().forEach(row -> {
            SeatZone zone = (SeatZone) row[0];
            SeatStatus status = (SeatStatus) row[1];
            Long count = (Long) row[2];
            stats.computeIfAbsent(zone.name(), key -> new LinkedHashMap<>())
                    .put(status.name(), count);
        });
        return stats;
    }

    private SeatDTO toDto(SeatEntity seat, boolean includeOccupancy) {
        String currentOccupancy = null;
        if (includeOccupancy) {
            currentOccupancy = resolveCurrentOccupancy(seat);
        }
        return SeatDTO.builder()
                .id(seat.getId())
                .seatNumber(seat.getSeatNumber())
                .zone(seat.getZone())
                .floor(seat.getFloor())
                .status(seat.getStatus())
                .hasPowerOutlet(seat.getHasPowerOutlet())
                .hasWindow(seat.getHasWindow())
                .currentOccupancy(currentOccupancy)
                .build();
    }

    private String resolveCurrentOccupancy(SeatEntity seat) {
        LocalDate today = LocalDate.now();
        return bookingRepository.findBySeat_IdAndBookingDateAndStatus(seat.getId(), today, BookingStatus.ACTIVE)
                .stream()
                .findFirst()
                .map(this::formatOccupancy)
                .orElse(null);
    }

    private String formatOccupancy(BookingEntity booking) {
        return String.format("Booked by user %s for %s", booking.getUserId(), booking.getTimeSlot().name());
    }

    private SeatEntity findActiveSeat(Long id) {
        return seatRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Seat not found with id " + id));
    }
}
