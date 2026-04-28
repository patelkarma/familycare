package com.familycare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {
    private UUID id;
    private UUID familyMemberId;
    private String familyMemberName;
    private String doctorName;
    private String speciality;
    private String hospital;
    private LocalDateTime appointmentDate;
    private String notes;
    private Boolean reminderSent;
    private LocalDateTime createdAt;
}
