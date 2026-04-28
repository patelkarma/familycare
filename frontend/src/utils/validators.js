import { z } from 'zod';

// Zod messages here are i18n KEYS, not user-facing text.
// In components, render error.message via `t(error.message, error.message)`
// so missing keys gracefully fall back to the key string.

export const registerSchema = z.object({
  role: z.enum(['FAMILY_HEAD', 'MEMBER']),
  name: z.string().min(2, 'validation.nameMin'),
  email: z.string().email('validation.emailInvalid'),
  password: z.string().min(6, 'validation.passwordMin'),
  phone: z.string().regex(/^\d{10}$/, 'validation.phoneTen').optional().or(z.literal('')),
  whatsappPhone: z.string().regex(/^\d{10}$/, 'validation.whatsappTen').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  chronicDiseases: z.string().optional().or(z.literal('')),
  familyHeadEmail: z.string().optional().or(z.literal('')),
}).refine(
  (data) => data.role !== 'MEMBER' || (data.familyHeadEmail && data.familyHeadEmail.length > 0),
  { message: 'validation.familyHeadRequired', path: ['familyHeadEmail'] }
);

export const loginSchema = z.object({
  email: z.string().email('validation.emailInvalid'),
  password: z.string().min(1, 'validation.passwordRequired'),
});

export const familyMemberSchema = z.object({
  name: z.string().min(2, 'validation.nameMin'),
  relationship: z.string().min(1, 'validation.relationshipRequired'),
  dateOfBirth: z.string().optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  whatsappPhone: z.string().regex(/^\d{10}$/, 'validation.whatsappTen').optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  chronicDiseases: z.string().optional().or(z.literal('')),
});

export const reportSchema = z.object({
  title: z.string().min(2, 'validation.titleMin').max(200),
  reportType: z.enum([
    'LAB',
    'IMAGING',
    'PRESCRIPTION',
    'DISCHARGE',
    'VACCINATION',
    'INSURANCE',
    'CONSULTATION',
    'OTHER',
  ], { errorMap: () => ({ message: 'validation.reportType' }) }),
  reportDate: z.string().min(1, 'validation.reportDateRequired'),
  doctorName: z.string().max(200).optional().or(z.literal('')),
  hospital: z.string().max(200).optional().or(z.literal('')),
  specialty: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  tags: z.string().max(500).optional().or(z.literal('')),
  linkedAppointmentId: z.string().optional().or(z.literal('')),
});

export const emergencyContactSchema = z.object({
  familyMemberId: z.string().min(1, 'validation.familyMemberRequired'),
  name: z.string().min(2, 'validation.nameMin').max(120),
  relationship: z.string().min(1, 'validation.relationshipRequired').max(80),
  phone: z
    .string()
    .regex(/^(\+?91)?[6-9]\d{9}$/, 'validation.indianMobile'),
  isPrimary: z.boolean().optional(),
});

export const medicineSchema = z.object({
  name: z.string().min(2, 'validation.medicineNameRequired'),
  genericName: z.string().optional().or(z.literal('')),
  dosage: z.string().min(1, 'validation.dosageRequired'),
  form: z.string().optional().or(z.literal('')),
  frequency: z.string().min(1, 'validation.frequencyRequired'),
  morning: z.string().optional().or(z.literal('')),
  afternoon: z.string().optional().or(z.literal('')),
  night: z.string().optional().or(z.literal('')),
  withFood: z.boolean().optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  stockCount: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
