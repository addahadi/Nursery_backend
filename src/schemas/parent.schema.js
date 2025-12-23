import { z } from 'zod';

export const ParentSignUpSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10).max(15),
  child: z.object({
    full_name: z.string().min(2).max(100),
    age: z.number().min(4).max(12),
    gender: z.enum(['male', 'female']),
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  }),
  documents: z.array(
    z.object({
      document_type: z.string(),
      file_url: z.string().url(),
    })
  ),
});

export const ParentLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const requestChildProfileChangeSchema = z.object({
  child_id: z.uuid(),
  field: z.enum(['full_name', 'age', 'gender', 'date_of_birth']),
  new_value: z.string(),
});
