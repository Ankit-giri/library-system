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
            LocalDate date, BookingStatus status, SeatZone zone, String studentId) {
        return (root, query, cb) -> {
            var seat = root.join("seat", JoinType.INNER);
            if (query != null) query.distinct(true);
            List<Predicate> preds = new ArrayList<>();
            if (date != null)      preds.add(cb.equal(root.get("bookingDate"), date));
            if (status != null)    preds.add(cb.equal(root.get("status"), status));
            if (zone != null)      preds.add(cb.equal(seat.get("zone"), zone));
            if (studentId != null) preds.add(cb.equal(root.get("studentId"), studentId));
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
}
