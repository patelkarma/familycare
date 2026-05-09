package com.familycare.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_member_id", nullable = false)
    private FamilyMember familyMember;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_user_id")
    private User uploadedBy;

    @Column(nullable = false, length = 200)
    private String title;

    /** LAB, IMAGING, PRESCRIPTION, DISCHARGE, VACCINATION, INSURANCE, CONSULTATION, OTHER */
    @Column(name = "report_type", nullable = false, length = 32)
    private String reportType;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "cloudinary_public_id", length = 300)
    private String cloudinaryPublicId;

    @Column(name = "cloudinary_resource_type", length = 16)
    private String cloudinaryResourceType;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    /** PDF, JPG, PNG */
    @Column(name = "file_type", length = 16)
    private String fileType;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "doctor_name", length = 200)
    private String doctorName;

    @Column(length = 200)
    private String hospital;

    @Column(length = 100)
    private String specialty;

    @Column(name = "report_date")
    private LocalDate reportDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /** Comma-separated tags for simplicity; parsed client-side. */
    @Column(length = 500)
    private String tags;

    @Column(name = "is_pinned_for_emergency", nullable = false)
    @Builder.Default
    private Boolean isPinnedForEmergency = false;

    /**
     * True when the underlying Cloudinary asset was uploaded with
     * {@code type=authenticated} and must be accessed via short-lived signed
     * URLs. Legacy rows uploaded before this flag existed are {@code false} —
     * for those we fall back to the stored public {@link #fileUrl}.
     */
    @Column(name = "private_access", nullable = false)
    @Builder.Default
    private Boolean privateAccess = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_appointment_id")
    private Appointment linkedAppointment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (isPinnedForEmergency == null) isPinnedForEmergency = false;
        if (privateAccess == null) privateAccess = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
