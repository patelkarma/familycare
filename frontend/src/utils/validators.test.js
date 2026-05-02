import { describe, it, expect } from 'vitest';
import { loginSchema, emergencyContactSchema } from './validators';

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
