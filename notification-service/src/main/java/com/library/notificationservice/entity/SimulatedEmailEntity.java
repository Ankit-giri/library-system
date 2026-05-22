package com.library.notificationservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

@Entity
@Table(name = "simulated_emails")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulatedEmailEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String recipient;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String body;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private OffsetDateTime sentAt;
}
