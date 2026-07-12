const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    full_name: z.string().min(1, 'Full name is required').max(120),
    email: z.string().email('Invalid email address').max(160),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    role: z.enum(['FLEET_MANAGER', 'DRIVER_OPS', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']).optional(),
    role_id: z.number().int().positive().optional(),
  }).refine((data) => data.role || data.role_id, {
    message: 'Either role or role_id is required',
    path: ['role'],
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
};
