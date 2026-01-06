import { z } from 'zod';

export const ActivityEnum = z.enum([
  'drawing',
  'music',
  'outdoor_play',
  'reading',
  'puzzles',
  'free_play',
]);

export const TimeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');

export const TeacherLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const AttendanceStatusEnum = z.enum(['present', 'absent', 'sick']);

export const AttendanceSchema = z.object({
  record_id: z.string().uuid().optional(),
  child_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO Date string (YYYY-MM-DD)
  status: AttendanceStatusEnum,
  check_in_time: z.string().nullable(), // Store as "HH:mm"
  check_out_time: z.string().nullable(), // Store as "HH:mm"
  created_at: z.string().datetime().optional(),
});

const ProgressCategorySchema = z.object({
  level: z.string().min(1), // e.g., "ممتاز", "جيد جداً"
  score: z.number().min(0).max(100),
  notes: z.string().optional(),
});

export const ProgressReportSchema = z.object({
  report_id: z.string().uuid().optional(),
  child_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  levels: z.object({
    eating: ProgressCategorySchema,
    sleeping: ProgressCategorySchema,
    social: ProgressCategorySchema,
    learning: ProgressCategorySchema,
    physical: ProgressCategorySchema,
  }),
  created_at: z.string().datetime().optional(),
});

export const DailyReportSchema = z.object({
  child_id: z.string().uuid({ message: 'معرف الطفل غير صحيح' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ غير صحيح' }),
  // Aligned with your INSERT INTO report statement
  foodIntake: z.enum(['Poor', 'Fair', 'Good', 'Excellent']),
  activitylevel: z.enum(['Low', 'Normal', 'High']),
  sleepQuality: z.enum(['Poor', 'Fair', 'Good']),
  behavoir: z.string().min(1, { message: 'يجب وصف السلوك' }),
  generalNotes: z.string().optional(),
});