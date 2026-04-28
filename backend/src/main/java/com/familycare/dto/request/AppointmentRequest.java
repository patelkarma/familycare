package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AppointmentRequest {

    @NotNull(message = "Family member ID is required")
    private UUID familyMemberId;

    @NotBlank(message = "Doctor name is required")
    private String doctorName;

    private String speciality;

    private String hospital;

    @NotBlank(message = "Appointment date is required")
    private String appointmentDate;

    private String notes;
}
