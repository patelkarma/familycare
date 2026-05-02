package com.familycare.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class IndianMedicineDictionaryTest {

    private final IndianMedicineDictionary dictionary = new IndianMedicineDictionary();

    @Test
    void findsExactMatchCaseInsensitive() {
        IndianMedicineDictionary.Entry hit = dictionary.findBestMatch("CROCIN");

        assertNotNull(hit);
        assertEquals("Crocin", hit.brandName);
        assertEquals("Paracetamol", hit.genericName);
    }

    @Test
    void recoversFromSingleCharacterOcrTypo() {
        // OCR commonly mis-reads 'i' as 'l' or 'e' as 'o' on low-quality scans.
        // The dictionary should still resolve a 1-edit-distance brand name.
        IndianMedicineDictionary.Entry hit = dictionary.findBestMatch("Crocon");

        assertNotNull(hit, "1-character typo should still match Crocin");
        assertEquals("Crocin", hit.brandName);
    }
}
