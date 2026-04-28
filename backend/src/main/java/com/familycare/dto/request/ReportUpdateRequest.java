package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ReportUpdateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

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

    @Size(max = 500)
    private String tags;

    private UUID linkedAppointmentId;
}
