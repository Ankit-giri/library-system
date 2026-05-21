package com.library.seatservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "seats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seat_number", nullable = false, unique = true, length = 32)
    private String seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SeatZone zone;

    @Column(nullable = false)
    private Integer floor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SeatStatus status;

    @Builder.Default
    @Column(name = "has_power_outlet", nullable = false)
    private Boolean hasPowerOutlet = false;

    @Builder.Default
    @Column(name = "has_window", nullable = false)
    private Boolean hasWindow = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean deleted = false;
}
