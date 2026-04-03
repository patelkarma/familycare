package com.familycare.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medicines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_member_id", nullable = false)
    private FamilyMember familyMember;

    @Column(nullable = false)
    private String name;

    @Column(name = "generic_name")
    private String genericName;

    @Column(nullable = false)
    private String dosage;

    private String form;

    @Column(nullable = false)
    private String frequency;

    @Column(columnDefinition = "TEXT")
    private String timing;

    @Column(name = "with_food")
    @Builder.Default
    private Boolean withFood = false;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "stock_count")
    @Builder.Default
    private Integer stockCount = 0;

    @Column(name = "low_stock_alert")
    @Builder.Default
    private Integer lowStockAlert = 5;

    private String notes;

    @Column(name = "prescription_url")
    private String prescriptionUrl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
