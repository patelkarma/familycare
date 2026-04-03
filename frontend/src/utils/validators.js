import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const familyMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  relationship: z.string().min(1, 'Relationship is required'),
  dateOfBirth: z.string().optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  chronicDiseases: z.string().optional().or(z.literal('')),
});

export const medicineSchema = z.object({
  name: z.string().min(2, 'Medicine name is required'),
  genericName: z.string().optional().or(z.literal('')),
  dosage: z.string().min(1, 'Dosage is required'),
  form: z.string().optional().or(z.literal('')),
  frequency: z.string().min(1, 'Frequency is required'),
  morning: z.string().optional().or(z.literal('')),
  afternoon: z.string().optional().or(z.literal('')),
  night: z.string().optional().or(z.literal('')),
  withFood: z.boolean().optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  stockCount: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
