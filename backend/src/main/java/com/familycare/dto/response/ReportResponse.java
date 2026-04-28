package com.familycare.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReportResponse {
    private UUID id;
    private UUID familyMemberId;
    private String familyMemberName;
    private String title;
    private String reportType;
    private String fileUrl;
    private String thumbnailUrl;
    private String fileType;
    private Long fileSizeBytes;
    private String doctorName;
    private String hospital;
    private String specialty;
    private LocalDate reportDate;
    private String notes;
    private String tags;
    private Boolean isPinnedForEmergency;
    private UUID linkedAppointmentId;
    private String linkedAppointmentLabel;
    private String uploadedByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
