import { describe, it, expect, beforeAll } from 'vitest';
import i18n from './index';
import en from './locales/en.json';
import hi from './locales/hi.json';

/**
 * Sanity tests for the i18n system. These exist because:
 *  - 9 language files are easy to leave half-translated
 *  - A missing key falls back silently, so the only sign in production is "the
 *    English string showed up in the Hindi UI" — caught here instead.
 */
describe('i18n', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('resolves a known key in English', () => {
    expect(i18n.t('auth.signIn', { lng: 'en' })).toBe('Sign In');
  });

  it('resolves the same key to a different string in Hindi', () => {
    const hindi = i18n.t('auth.signIn', { lng: 'hi' });
    expect(hindi).not.toBe('Sign In');
    expect(hindi).toMatch(/[ऀ-ॿ]/); // Devanagari Unicode block
  });

  it('hi.json covers every key present in en.json (no missing translations)', () => {
    const missing = collectMissingKeys(en, hi, '');
    expect(missing, `Hindi is missing keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('falls back to English for unknown languages', () => {
    expect(i18n.t('auth.signIn', { lng: 'xx-fake' })).toBe('Sign In');
  });
});

function collectMissingKeys(reference, target, path) {
  const missing = [];
  for (const key of Object.keys(reference)) {
    const refVal = reference[key];
    const targetVal = target?.[key];
    const fullPath = path ? `${path}.${key}` : key;

    if (typeof refVal === 'object' && refVal !== null) {
      missing.push(...collectMissingKeys(refVal, targetVal ?? {}, fullPath));
    } else if (targetVal === undefined || targetVal === '') {
      missing.push(fullPath);
    }
  }
  return missing;
}
