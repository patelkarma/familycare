package com.familycare.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "appointments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "family_member_id", nullable = false)
    private FamilyMember familyMember;

    @Column(name = "doctor_name")
    private String doctorName;

    private String speciality;

    private String hospital;

    @Column(name = "appointment_date", nullable = false)
    private LocalDateTime appointmentDate;

    private String notes;

    @Column(name = "reminder_sent")
    @Builder.Default
    private Boolean reminderSent = false;

    @Column(name = "reminder_week_sent")
    @Builder.Default
    private Boolean reminderWeekSent = false;

    @Column(name = "reminder_3day_sent")
    @Builder.Default
    private Boolean reminder3DaySent = false;

    @Column(name = "reminder_2day_sent")
    @Builder.Default
    private Boolean reminder2DaySent = false;

    @Column(name = "reminder_1day_sent")
    @Builder.Default
    private Boolean reminder1DaySent = false;

    @Column(name = "reminder_day_of_sent")
    @Builder.Default
    private Boolean reminderDayOfSent = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
