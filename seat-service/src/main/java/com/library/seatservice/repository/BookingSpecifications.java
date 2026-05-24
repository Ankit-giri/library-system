package com.library.seatservice.repository;

import com.library.seatservice.entity.BookingEntity;
import com.library.seatservice.entity.BookingStatus;
import com.library.seatservice.entity.SeatZone;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public class BookingSpecifications {

    public static Specification<BookingEntity> forAdminList(
            LocalDate dateFrom, LocalDate dateTo,
            BookingStatus status, SeatZone zone,
            String studentId, String search) {
        return (root, query, cb) -> {
            var seat = root.join("seat", JoinType.INNER);
            if (query != null) query.distinct(true);
            List<Predicate> preds = new ArrayList<>();
            if (dateFrom != null)  preds.add(cb.greaterThanOrEqualTo(root.get("bookingDate"), dateFrom));
            if (dateTo != null)    preds.add(cb.lessThanOrEqualTo(root.get("bookingDate"), dateTo));
            if (status != null)    preds.add(cb.equal(root.get("status"), status));
            if (zone != null)      preds.add(cb.equal(seat.get("zone"), zone));
            if (studentId != null) preds.add(cb.equal(root.get("studentId"), studentId));
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                preds.add(cb.or(
                    cb.like(cb.lower(root.get("studentId")), pattern),
                    cb.like(cb.lower(root.get("userEmail")), pattern),
                    cb.like(cb.lower(root.get("userName")), pattern),
                    cb.like(cb.lower(seat.get("seatNumber")), pattern),
                    cb.like(cb.lower(root.get("id").as(String.class)), pattern)
                ));
            }
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
}
