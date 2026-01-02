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

export const addActivityMediaschema = z.object({
  name: z.string(),
  file_path: z.string().min(1),
  description: z.string().min(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'), // ممكن تختار التاريخ، إلا ما حطاش نديرو اليوم
  classroomId: z.int(),
});
<<<<<<< HEAD
=======

/**
 * Schema لتحديث حضور طفل
 * الأستاذ لازم يرسل هذه البيانات فقط
 */

export const UpdateAttenceSchema = z
  .object({
    childName: z.string().min(5),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
    status: z.enum(['PRESENT', 'ABSETN', 'SICK']),

    checkInTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Invalid time format HH:MM')
      .optional(),

    checkOutTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Invalid time format HH:MM')
      .optional(),
  })

  .superRefine((data, ctx) => {
    /**
     * 🔴 الحالة 1: ABSENT
     * لا يُسمح بإرسال أوقات
     */
    if (data.status === 'ABSENT') {
      if (data.checkInTime || data.checkOutTime) {
        ctx.addIssue({
          path: ['checkInTime'],
          message: 'Absent child cannot have chek-in or check-out ',
        });
      }
    }

    /**
     * 🟢 الحالة 2: PRESENT
     * لازم checkInTime,checkoutTime
     */
    if (data.status === 'PRESENT') {
      if (!data.checkInTime) {
        ctx.addIssue({
          path: ['checkInTime'],
          message: 'checkInTime is required whern status is PRESENT',
        });
      }

      if (!data.checkOutTime) {
        ctx.addIssue({
          path: ['checkOutTime'],
          message: 'checkOutTime is required when status is Prestnt ',
        });
      }
    }

    /**
     * 🟡 SICK
     * لازم in + out
     */

    if (data.status === 'SICK') {
      if (!data.checkInTime) {
        ctx.addIssue({
          path: ['checkInTime'],
          message: 'checkInTime is required when status is Sick',
        });
      }
      if (!data.checkOutTime) {
        ctx.addIssue({
          path: ['checkOutTime'],
          message: 'checkOutTime is required when status is SICk',
        });
      }
    }
  });




//schema for SubmitDailyReportSchema

export const SubmitDailyReportSchema = z.object({
  food_intake: z.object({
    type: z.string(),      // breakfast | lunch | snack
    opinion: z.string(),
    food: z.string(),
  }),

  activity_level: z
    .array(z.string())
    .min(1)
    .max(6),

  sleep_quality: z.object({
    startTime: z.string(), // HH:mm
    endTime: z.string(),   // HH:mm
    sleptWell: z.boolean(),
  }),

  behaviour: z.string(),
  general_notes: z.string(),
});
>>>>>>> dachbord_teacher
