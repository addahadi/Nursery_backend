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

// schema for teacher create a report
export const DailyReportSchema = z.object({
  child_id: z.string().uuid(),
  content: z.string().min(10),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),

  food_intake: z.object({
    type: z.string(), // breakfast | lunch | snack
    opinion: z.string(),
    food: z.string(),
  }),

  activity_level: z
    .array(ActivityEnum)
    .min(1, 'Select at least one activity')
    .max(6, 'Too many activities selected'),

  sleep_quality: z.object({
    startTime: TimeString,
    endTime: TimeString,
    sleptWell: z.boolean(),
  }),

  general_notes: z.string(),
});

// schema for add media
export const addActivityMediaschema = z.object({
  name: z.string(),
  file_path: z.string().min(1),
  description: z.string().min(10),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  classroomId: z.number().int(),
});

/**
 * Schema لتحديث حضور طفل
 */
export const UpdateAttenceSchema = z
  .object({
    childName: z.string().min(5),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
    status: z.enum(['PRESENT', 'ABSENT', 'SICK']),
    checkInTime: TimeString.optional(),
    checkOutTime: TimeString.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'ABSENT') {
      if (data.checkInTime || data.checkOutTime) {
        ctx.addIssue({
          path: ['checkInTime'],
          message: 'Absent child cannot have check-in or check-out',
        });
      }
    }

    if (data.status === 'PRESENT' || data.status === 'SICK') {
      if (!data.checkInTime) {
        ctx.addIssue({
          path: ['checkInTime'],
          message: 'checkInTime is required',
        });
      }
      if (!data.checkOutTime) {
        ctx.addIssue({
          path: ['checkOutTime'],
          message: 'checkOutTime is required',
        });
      }
    }
  });

// schema for submit daily report
export const SubmitDailyReportSchema = z.object({
  food_intake: z.object({
    type: z.string(),
    opinion: z.string(),
    food: z.string(),
  }),

  activity_level: z.array(ActivityEnum).min(1).max(6),

  sleep_quality: z.object({
    startTime: TimeString,
    endTime: TimeString,
    sleptWell: z.boolean(),
  }),

  behaviour: z.string(),
  general_notes: z.string(),
});
