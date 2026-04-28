package com.familycare.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sos_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SosEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_member_id", nullable = false)
    private FamilyMember familyMember;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "triggered_by_user_id", nullable = false)
    private User triggeredBy;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "accuracy_meters")
    private Double accuracyMeters;

    @Column(name = "message_body", columnDefinition = "TEXT")
    private String messageBody;

    @Column(name = "contacts_notified", nullable = false)
    private int contactsNotified;

    /**
     * JSON-as-string of per-recipient delivery status:
     * [{"contactId":"...","name":"...","phone":"...","sms":"SENT|FAILED","whatsapp":"SENT|FAILED"}]
     * Stored as text so we don't depend on Hibernate JSON support.
     */
    @Column(name = "delivery_summary", columnDefinition = "TEXT")
    private String deliverySummary;

    @Column(name = "triggered_at", nullable = false, updatable = false)
    private LocalDateTime triggeredAt;

    @PrePersist
    protected void onCreate() {
        if (triggeredAt == null) triggeredAt = LocalDateTime.now();
    }
}
