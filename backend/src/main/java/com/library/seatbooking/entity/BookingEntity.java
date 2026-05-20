package com.library.seatbooking.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class BookingEntity {
    @Id
    private Long id;
}
