import z from 'zod';

export const FilteredParentListSchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'APPROVED_AWAITING_PAYMENT', 'ACTIVE', 'REJECTED']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
});

export const CreateParentSchema = z.object({
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
      document_type: z.enum(['birth_certificate', 'medical_form']),
      file_url: z.string().url(),
    })
  ),
});

export const CreateClassRoomSchema = z.object({
  name: z.string().min(2).max(100),
  age_group: z.enum(['0-1 year', '1-2 years', '2-3 years', '3-4 years', '4-5 years']),
  capacity: z.number().int().positive().max(50),
  teacherId: z.string().min(2).max(100),
});


export const EditClassRoomSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    age_group: z.enum(['0-1 year', '1-2 years', '2-3 years', '3-4 years', '4-5 years']).optional(),
    capacity: z.number().int().positive().max(50).optional(),
    teacherId: z.number().int().positive().optional(), 
})


export const FilteredTeacherListSchema = z.object({
  status: z.enum(['ACTIVE', 'UNACTIVE']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
});

export const CreateTeacherSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10).max(15),
  status: z.enum(['ACTIVE', 'UNACTIVE']),
});

export const EditTeacherSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  status: z.enum(['ACTIVE', 'UNACTIVE']).optional(),
});


export const ValidateTeacherIdSchema = z.object({
  id: z.uuid()
})


export const ValidateClassroomIdSchema = z.object({
  id: z.uuid(),
});

export const ValidateUserIdSchema = z.object({
  id: z.string().uuid(),
});

export const getPaymentsListSchema = z.object({
  status: z.enum(['paid', 'canceled', 'past_due']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
});

export const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});


export const EditAdminSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
})
 

