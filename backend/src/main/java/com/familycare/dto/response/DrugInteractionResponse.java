package com.familycare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugInteractionResponse {
    private String drugName;
    private String normalizedName;
    private String rxcui;
    /** True if any data source returned info. False = "we don't know," not "safe." */
    private boolean dataAvailable;
    /** Interactions where another active medicine appears in the new drug's label text. */
    private List<InteractionMatch> interactionsWithExisting;
    /** Top general warnings extracted from the drug's label. */
    private List<String> generalWarnings;
    /** Disclaimer copy for the UI. */
    private String disclaimer;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InteractionMatch {
        private String withDrug;
        private String snippet;
    }
}
