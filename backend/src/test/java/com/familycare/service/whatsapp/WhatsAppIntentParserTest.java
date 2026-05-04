package com.familycare.service.whatsapp;

import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The audience for these reminders is an elderly parent on WhatsApp. They will
 * not type "TAKEN" in capital letters — they'll send "ok", "haan", "✅", "lia",
 * or "खा लिया". This test locks in that natural-language reply set so a future
 * "let's tighten the regex" change can't quietly break the only path the
 * elderly user has.
 */
class WhatsAppIntentParserTest {

    private final WhatsAppIntentParser parser = new WhatsAppIntentParser();

    @ParameterizedTest
    @ValueSource(strings = {
            // English — case variants
            "TAKEN", "taken", "Taken", "tAkEn", "took", "TAKE",
            // Short / numeric / acknowledgment
            "T", "1", "y", "Y", "yes", "yep", "yeah", "ya", "ok", "OK", "okay", "K",
            // Phrased
            "done", "finished", "fine", "got it", "GOTIT",
            // Hinglish (Latin transliteration of Hindi)
            "haan", "HAAN", "han", "ha", "ji", "lia", "liya", "kha liya", "khaliya", "khaya",
            // Devanagari
            "हाँ", "हां", "लिया", "खा लिया", "खाया",
            // Emoji (with and without variation selectors)
            "✅", "✓", "✔", "✔️", "👍", "👌"
    })
    void recognizesTakenIntentAcrossCaseLanguageAndEmoji(String input) {
        assertEquals(IntentType.TAKEN, parser.parse(input).getType(),
                () -> "Expected TAKEN for input: \"" + input + "\"");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            // English
            "SKIP", "skip", "Skipped", "skipping", "missed", "miss", "later",
            "no", "NO", "n", "nope", "nah", "S", "2", "not yet", "notyet",
            // Hinglish
            "nahi", "NAHIN", "na", "mat",
            // Devanagari
            "नहीं", "नही", "ना",
            // Emoji
            "❌", "✖", "✗", "👎"
    })
    void recognizesSkipIntentAcrossCaseLanguageAndEmoji(String input) {
        assertEquals(IntentType.SKIP, parser.parse(input).getType(),
                () -> "Expected SKIP for input: \"" + input + "\"");
    }

    @Test
    void takenWithMemberHintRoutesToCorrectMember() {
        // Caregiver replying for someone else: "TAKEN mom".
        // The parser uppercases its input before extraction, so the hint is
        // already normalized — the downstream resolver does case-insensitive
        // name matching against family members.
        Intent intent = parser.parse("taken mom");
        assertEquals(IntentType.TAKEN, intent.getType());
        assertEquals("MOM", intent.get("memberHint"));
    }

    @Test
    void multiWordTakenAliasIsNotMisreadAsHint() {
        // "kha liya" must match as the affirm itself, not be split into
        // "kha" + memberHint=liya. Longest-first ordering in the regex
        // alternation guarantees this.
        Intent intent = parser.parse("kha liya");
        assertEquals(IntentType.TAKEN, intent.getType());
        assertEquals(null, intent.get("memberHint"));
    }

    @Test
    void unknownInputIsNotForceMatched() {
        assertEquals(IntentType.UNKNOWN, parser.parse("hello there").getType());
        assertEquals(IntentType.UNKNOWN, parser.parse("").getType());
        assertEquals(IntentType.UNKNOWN, parser.parse(null).getType());
    }

    @Test
    void bpAndSugarStillParse() {
        Intent bp = parser.parse("BP 140 90");
        assertEquals(IntentType.BP, bp.getType());
        assertEquals("140", bp.get("systolic"));
        assertEquals("90", bp.get("diastolic"));

        Intent sugar = parser.parse("sugar 110");
        assertEquals(IntentType.SUGAR, sugar.getType());
        assertEquals("110", sugar.get("value"));
    }
}
