package com.library.paymentservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "membership_fees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipFeeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false, length = 180)
    private String studentId;

    @Column(name = "plan", nullable = false, length = 32)
    private String plan;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "transaction_id", nullable = false, unique = true, length = 64)
    private String transactionId;

    @Column(name = "card_last_four", length = 4)
    private String cardLastFour;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @CreationTimestamp
    @Column(name = "paid_at", nullable = false, updatable = false)
    private OffsetDateTime paidAt;
}
