package com.familycare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PillIdentifyResponse {
    /** Free-form description from the model. */
    private String description;
    /** Best-guess medicine name (matched against the member's inventory if possible). */
    private String matchedMedicineName;
    private UUID matchedMedicineId;
    /** "high" / "medium" / "low" — how confident the match is. */
    private String confidence;
    private String disclaimer;
}
