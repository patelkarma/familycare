package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ReportCreateRequest {

    @NotNull(message = "Family member ID is required")
    private UUID familyMemberId;

    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

    /** LAB, IMAGING, PRESCRIPTION, DISCHARGE, VACCINATION, INSURANCE, CONSULTATION, OTHER */
    @NotBlank(message = "Report type is required")
    private String reportType;

    @Size(max = 200)
    private String doctorName;

    @Size(max = 200)
    private String hospital;

    @Size(max = 100)
    private String specialty;

    private LocalDate reportDate;

    private String notes;

    /** Comma-separated tags. */
    @Size(max = 500)
    private String tags;

    private UUID linkedAppointmentId;
}
