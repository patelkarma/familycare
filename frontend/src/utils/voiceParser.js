/**
 * Voice → vital reading parser. Designed to be forgiving with natural speech:
 *   - "BP 140 over 90"           → BP 140/90
 *   - "Mom's BP is 140 by 90"    → BP 140/90
 *   - "Her blood pressure is 140 over 90 today" → BP 140/90
 *   - "Sugar 110"                → SUGAR 110
 *   - "Her sugar reading is 110" → SUGAR 110
 *   - "120/80"                    → BP 120/80 (no label needed when slashed)
 *   - "Pulse 72"                  → PULSE 72
 *
 * Strategy: normalise filler / number-words → digits, then find numbers and
 * keywords independently. Order between label and number doesn't matter.
 */

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

const TENS = new Set([20, 30, 40, 50, 60, 70, 80, 90]);

/**
 * Convert spoken numbers into digits inside a string. Handles:
 *   - "one hundred forty"   → "140"
 *   - "one forty"            → "140" (Indian-English shorthand for 140)
 *   - "twenty one"           → "21"
 *   - "ninety"               → "90"
 */
const wordsToDigits = (input) => {
  const tokens = input.toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];
  let acc = null;
  const flush = () => {
    if (acc !== null) {
      out.push(String(acc));
      acc = null;
    }
  };

  for (const tok of tokens) {
    const n = NUMBER_WORDS[tok];
    if (n === undefined) {
      flush();
      out.push(tok);
      continue;
    }
    if (n === 100) {
      acc = (acc === null ? 1 : acc) * 100;
    } else if (TENS.has(n)) {
      if (acc !== null && acc >= 1 && acc <= 9) {
        // "one twenty" → 120
        acc = acc * 100 + n;
      } else {
        acc = (acc || 0) + n;
      }
    } else {
      // ones (1–9) and teens (11–19)
      acc = (acc === null ? 0 : acc) + n;
    }
  }
  flush();
  return out.join(' ');
};

/**
 * Parse a transcript into a vital reading. Returns null if no usable data.
 * Logs the normalisation steps to the console so debugging is trivial.
 */
export const parseVitalSpeech = (raw) => {
  if (!raw) return null;

  let s = wordsToDigits(raw);
  s = s
    .toLowerCase()
    .replace(/[,:;]/g, ' ')
    .replace(/\bover\b/g, '/')
    .replace(/\bby\b/g, '/')
    .replace(/\bslash\b/g, '/')
    .replace(/\s+/g, ' ')
    .trim();

  // Pull all numbers (preserving order)
  const numbers = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);

  if (typeof console !== 'undefined') {
    console.log('[voice]', JSON.stringify({ raw, normalised: s, numbers }));
  }

  if (numbers.length === 0) return null;

  const has = (re) => re.test(s);

  // Two-number patterns first (BP) — ordered by specificity.

  // 1. Explicit BP label. Take up to two numbers; partial = systolic only.
  if (has(/\b(?:bp|blood\s*pressure|pressure)\b/)) {
    if (numbers.length >= 2) {
      return { type: 'BP', valuePrimary: numbers[0], valueSecondary: numbers[1] };
    }
    if (numbers.length === 1) {
      // Speech often drops the second number ("BP one forty over ninety" →
      // recognised as "BP over 140"). Fill what we have and let the form
      // prompt for the missing diastolic.
      return { type: 'BP', valuePrimary: numbers[0], valueSecondary: null, partial: true };
    }
    return null;
  }

  // 2. Slash pattern even without a label: "140/90"
  const slash = s.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (slash) {
    return {
      type: 'BP',
      valuePrimary: parseFloat(slash[1]),
      valueSecondary: parseFloat(slash[2]),
    };
  }

  // Single-number labelled patterns. First match wins.
  const labelTypes = [
    [/\b(?:sugar|glucose|blood\s*sugar)\b/, 'SUGAR'],
    [/\b(?:pulse|heart\s*rate|heart\s*beat|bpm)\b/, 'PULSE'],
    [/\b(?:oxygen|spo\s*2|sp\s*o\s*2|sp\s*o\s*two|saturation)\b/, 'SPO2'],
    [/\b(?:temperature|temp|fever)\b/, 'TEMP'],
    [/\b(?:weight|weigh)\b/, 'WEIGHT'],
  ];

  for (const [re, type] of labelTypes) {
    if (has(re)) {
      return { type, valuePrimary: numbers[0] };
    }
  }

  // 3. Last-ditch: two numbers near each other but no label → assume BP
  // (Common shorthand: "140 90" said in BP context.)
  if (numbers.length === 2 && numbers[0] >= 60 && numbers[0] <= 250 && numbers[1] >= 30 && numbers[1] <= 150) {
    return { type: 'BP', valuePrimary: numbers[0], valueSecondary: numbers[1] };
  }

  return null;
};
