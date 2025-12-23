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

// sheema for teacher ceat a raporte ;

export const DailyReportSchema = z.object({
  child_id: z.string().uuid(), //من بعد نزيدوها في الفرونت اند

  content: z.string().min(10), // محتوى التقرير

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'), // ممكن تختار التاريخ، إلا ما حطاش نديرو اليوم
  food_intake: z.object({
    type: z.string(), // snack, breakfast, lanch
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
//schema for addmedia 

export const addActivityMediaschema= z.object({
name : z.string(),
file_path: z.string().min(1),
description: z.string().min(10),
 date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'), // ممكن تختار التاريخ، إلا ما حطاش نديرو اليوم
classroomId: z.int(),
});