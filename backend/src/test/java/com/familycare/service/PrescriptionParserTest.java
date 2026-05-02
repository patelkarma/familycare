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
}
