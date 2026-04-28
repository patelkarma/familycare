package com.familycare.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medicine_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicineLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_member_id", nullable = false)
    private FamilyMember familyMember;

    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;

    @Column(name = "taken_at")
    private LocalDateTime takenAt;

    @Column(nullable = false)
    private String status;

    @Column(name = "dose_timing")
    private String doseTiming;

    private String notes;

    @Column(length = 20)
    private String channel;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "marked_by")
    private User markedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
