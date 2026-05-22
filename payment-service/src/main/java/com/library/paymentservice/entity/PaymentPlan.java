package com.library.paymentservice.entity;

import com.library.paymentservice.dto.PaymentDTO;

public enum PaymentPlan {
    MONTHLY(199, 30, "Monthly membership plan with full access to library seats."),
    QUARTERLY(549, 90, "Three-month membership plan with discounted rate."),
    YEARLY(1999, 365, "Annual membership plan with maximum savings and priority booking."),
    WEEKLY(79, 7, "Weekly membership plan for short-term access.");

    private final int price;
    private final int durationDays;
    private final String description;

    PaymentPlan(int price, int durationDays, String description) {
        this.price = price;
        this.durationDays = durationDays;
        this.description = description;
    }

    public int getPrice() {
        return price;
    }

    public int getDurationDays() {
        return durationDays;
    }

    public String getDescription() {
        return description;
    }

    public PaymentDTO toDto() {
        return PaymentDTO.builder()
                .plan(name())
                .price(price)
                .durationDays(durationDays)
                .description(description)
                .build();
    }
}
