import { describe, it, expect } from 'vitest';
import { loginSchema, emergencyContactSchema, medicineSchema } from './validators';

describe('loginSchema', () => {
  it('accepts a valid email + password pair', () => {
    const result = loginSchema.safeParse({
      email: 'alice@example.com',
      password: 'hunter22',
    });
    expect(result.success).toBe(true);
  });

  it('rejects malformed emails', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'hunter22',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('validation.emailInvalid');
  });

  it('rejects empty passwords', () => {
    const result = loginSchema.safeParse({
      email: 'alice@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('emergencyContactSchema', () => {
  it('accepts a 10-digit Indian mobile starting with 6-9', () => {
    const result = emergencyContactSchema.safeParse({
      familyMemberId: 'fm-1',
      name: 'Rohit',
      relationship: 'Brother',
      phone: '9876543210',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a number starting with 1-5 (invalid Indian mobile)', () => {
    const result = emergencyContactSchema.safeParse({
      familyMemberId: 'fm-1',
      name: 'Rohit',
      relationship: 'Brother',
      phone: '1234567890',
    });
    expect(result.success).toBe(false);
  });
});

describe('medicineSchema', () => {
  const baseValid = {
    name: 'Amlodipine',
    dosage: '5mg',
    frequency: 'Once daily',
    morning: '09:00',
    afternoon: '',
    night: '',
  };

  it('accepts a once-daily medicine with one timing slot filled', () => {
    const result = medicineSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('rejects "Twice daily" with only one slot filled', () => {
    const result = medicineSchema.safeParse({
      ...baseValid,
      frequency: 'Twice daily',
      morning: '09:00',
      afternoon: '',
      night: '',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/2 time slots? filled/);
  });

  it('accepts "Three times daily" only when all three slots are filled', () => {
    const ok = medicineSchema.safeParse({
      ...baseValid,
      frequency: 'Three times daily',
      morning: '09:00', afternoon: '13:00', night: '21:00',
    });
    expect(ok.success).toBe(true);

    const missingOne = medicineSchema.safeParse({
      ...baseValid,
      frequency: 'Three times daily',
      morning: '09:00', afternoon: '13:00', night: '',
    });
    expect(missingOne.success).toBe(false);
  });

  it('rejects "As needed" if any time slot is filled', () => {
    const result = medicineSchema.safeParse({
      ...baseValid,
      frequency: 'As needed',
      morning: '09:00',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/doesn't use scheduled times/);
  });

  it('accepts "As needed" with no time slots (PRN flow)', () => {
    const result = medicineSchema.safeParse({
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: 'As needed',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when endDate precedes startDate', () => {
    const result = medicineSchema.safeParse({
      ...baseValid,
      startDate: '2026-06-01',
      endDate: '2026-05-31',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('End date cannot be before start date');
  });

  it('accepts equal start and end dates (one-day course)', () => {
    const result = medicineSchema.safeParse({
      ...baseValid,
      startDate: '2026-06-01',
      endDate: '2026-06-01',
    });
    expect(result.success).toBe(true);
  });

  it('accepts "Weekly" frequency with one time slot', () => {
    const result = medicineSchema.safeParse({
      ...baseValid,
      frequency: 'Weekly',
      weeklyDay: 'MONDAY',
      morning: '09:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects medicine name shorter than 2 chars', () => {
    const result = medicineSchema.safeParse({ ...baseValid, name: 'A' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('validation.medicineNameRequired');
  });

  it('rejects empty dosage', () => {
    const result = medicineSchema.safeParse({ ...baseValid, dosage: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('validation.dosageRequired');
  });
});
