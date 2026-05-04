package com.familycare.service;

import com.familycare.config.IndianMedicineDictionary;
import com.familycare.dto.response.DetectedMedicineResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PrescriptionParserTest {

    private PrescriptionParser parser;

    @BeforeEach
    void setUp() {
        // The dictionary is a no-arg @Component; we can construct it directly for tests.
        parser = new PrescriptionParser(new IndianMedicineDictionary());
    }

    @Test
    void parsesAbbreviatedFrequencyAndDosage() {
        // "BD" = Twice daily, with explicit tablet form and dosage in mg
        List<DetectedMedicineResponse> results = parser.parse("Tab. Crocin 500mg BD");

        assertEquals(1, results.size());
        DetectedMedicineResponse med = results.get(0);
        assertEquals("Crocin", med.getName());
        assertEquals("Paracetamol", med.getGenericName());
        assertEquals("500mg", med.getDosage());
        assertEquals("Tablet", med.getForm());
        assertEquals("Twice daily", med.getFrequency());
        assertNotNull(med.getTiming());
        assertTrue(med.getTiming().containsKey("morning"));
        assertTrue(med.getTiming().containsKey("night"));
    }

    @Test
    void parsesTripletNotation() {
        // 1-0-1 means morning + night, twice daily
        List<DetectedMedicineResponse> results = parser.parse("Dolo 650 1-0-1 x 5 days");

        assertEquals(1, results.size());
        DetectedMedicineResponse med = results.get(0);
        assertEquals("Twice daily", med.getFrequency());
        assertEquals(2, med.getTiming().size());
        assertTrue(med.getTiming().containsKey("morning"));
        assertTrue(med.getTiming().containsKey("night"));
        assertFalse(med.getTiming().containsKey("afternoon"));
        assertEquals(5, med.getDurationDays());
    }

    @Test
    void convertsWeeksAndMonthsToDays() {
        List<DetectedMedicineResponse> twoWeeks = parser.parse("Augmentin 625mg BD x 2 weeks");
        List<DetectedMedicineResponse> oneMonth = parser.parse("Crocin 500mg OD for 1 month");

        assertEquals(14, twoWeeks.get(0).getDurationDays());
        assertEquals(30, oneMonth.get(0).getDurationDays());
    }

    @Test
    void returnsEmptyForBlankOrNullInput() {
        assertTrue(parser.parse(null).isEmpty());
        assertTrue(parser.parse("").isEmpty());
        assertTrue(parser.parse("   ").isEmpty());
    }

    @Test
    void doesNotDoubleCountBrandPlusGenericFromCaptionLines() {
        // Real failure mode: the Mehta Clinic prescription from 2026-05-04
        // produced 11 medicines from 4 actual entries. OCR layouts split a single
        // prescription row into the brand line and a caption line right under it
        // ("Paracetamol | After food"); both matched independently. The fix:
        // dedup by genericName + reject lines without any prescription signal
        // (form / dosage / freq abbrev / triplet).
        String ocrText = """
                Dr. Mehta Clinic
                DR. RAJESH A. MEHTA
                MBBS, MD (Internal Medicine)
                12, Alkapuri Society, Near City Park
                Vadodara - 390 007, Gujarat
                MCI REG. NO. 47382-A
                PATIENT NAME: Karma Patel
                AGE / SEX: 34 Yrs / Female
                DATE: 04/05/2026
                WEIGHT: 58 kg
                DIAGNOSIS: Acute URTI · Gastritis
                ALLERGIES: NKDA
                Rx
                1. Tab. Crocin 500 mg     BD x 5 Days
                Paracetamol | After food  Twice daily
                2. Tab. Pantop 40 mg     OD x 7 Days
                Pantoprazole | Before breakfast  Once daily
                3. Cap. Becosules     OD x 30 Days
                B-Complex + Vitamin C | After food  Once daily
                4. Syp. Grilinctus     BD x 5 Days
                Cough Linctus | 2 tsp (10 mL) per dose  Twice daily
                DOCTOR'S INSTRUCTIONS
                Take plenty of warm fluids and rest. Avoid cold beverages and
                oily/spicy food for at least 5 days. Return immediately if fever
                exceeds 103 F, breathing difficulty, or symptoms worsen.
                FOLLOW-UP APPOINTMENT 12 May 2026
                Dr. Rajesh A. Mehta, MD - Internal Medicine
                """;

        List<DetectedMedicineResponse> results = parser.parse(ocrText);

        assertEquals(4, results.size(),
                () -> "Expected 4 medicines, got " + results.size() + ": "
                        + results.stream().map(DetectedMedicineResponse::getName).toList());

        List<String> names = results.stream().map(DetectedMedicineResponse::getName).toList();
        assertTrue(names.contains("Crocin"),  "Crocin should be detected, got: " + names);
        assertTrue(names.contains("Pantop"),  "Pantop should be detected, got: " + names);
        assertTrue(names.contains("Grilinctus"), "Grilinctus should be detected, got: " + names);
        // Becosules is dictionary entry "Becosule" — fuzzy match accepted.
        assertTrue(names.stream().anyMatch(n -> n.toLowerCase().startsWith("becosule")),
                "A Becosule(s) entry should be detected, got: " + names);
    }
}
