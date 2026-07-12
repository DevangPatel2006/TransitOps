const { z } = require('zod');

const dateCoercion = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format (must be YYYY-MM-DD)',
}).transform((val) => new Date(val));

const createDriverSchema = z.object({
  body: z.object({
    full_name: z.string().min(1, 'Full name is required').max(120),
    license_number: z.string().min(1, 'License number is required').max(40),
    license_category: z.string().min(1, 'License category is required').max(20),
    license_expiry: dateCoercion,
    contact_number: z.string().min(1, 'Contact number is required').max(20),
    safety_score: z.number().min(0).max(100).optional(),
    status: z.enum(['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED']).optional(),
  }),
});

const updateDriverSchema = z.object({
  body: z.object({
    full_name: z.string().min(1).max(120).optional(),
    license_number: z.string().min(1).max(40).optional(),
    license_category: z.string().min(1).max(20).optional(),
    license_expiry: dateCoercion.optional(),
    contact_number: z.string().min(1).max(20).optional(),
    safety_score: z.number().min(0).max(100).optional(),
    status: z.enum(['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED']).optional(),
  }),
});

const queryDriverSchema = z.object({
  query: z.object({
    status: z.enum(['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED']).optional(),
    expiringBefore: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format for expiringBefore',
    }).transform((val) => new Date(val)).optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['AVAILABLE', 'SUSPENDED']),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

module.exports = {
  createDriverSchema,
  updateDriverSchema,
  queryDriverSchema,
  updateStatusSchema,
  idParamSchema,
};
