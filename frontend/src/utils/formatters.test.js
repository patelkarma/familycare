import { describe, it, expect, vi, afterEach } from 'vitest';
import { getInitials, formatRelationship, getGreeting } from './formatters';

describe('getInitials', () => {
  it('returns first letters of first two words, uppercased', () => {
    expect(getInitials('Karma Patel')).toBe('KP');
    expect(getInitials('alice bob carol')).toBe('AB');
  });

  it('returns "?" when name is missing', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
    expect(getInitials('')).toBe('?');
  });
});

describe('formatRelationship', () => {
  it('title-cases the input', () => {
    expect(formatRelationship('FATHER')).toBe('Father');
    expect(formatRelationship('mother')).toBe('Mother');
  });
});

describe('getGreeting', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('says "Good morning" before noon', () => {
    vi.setSystemTime(new Date('2026-05-02T08:00:00'));
    expect(getGreeting()).toBe('Good morning');
  });

  it('says "Good afternoon" between noon and 5pm', () => {
    vi.setSystemTime(new Date('2026-05-02T14:00:00'));
    expect(getGreeting()).toBe('Good afternoon');
  });

  it('says "Good evening" after 5pm', () => {
    vi.setSystemTime(new Date('2026-05-02T20:00:00'));
    expect(getGreeting()).toBe('Good evening');
  });
});
