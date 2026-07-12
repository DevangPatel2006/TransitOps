const { z } = require('zod');

const dateCoercion = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format (must be YYYY-MM-DD)',
}).transform((val) => new Date(val));

const createFuelLogSchema = z.object({
  body: z.object({
    vehicle_id: z.number().int().positive('Vehicle ID must be a positive integer'),
    trip_id: z.number().int().positive('Trip ID must be a positive integer').optional(),
    liters: z.number().positive('Liters must be greater than 0'),
    cost: z.number().nonnegative('Cost cannot be negative'),
    log_date: dateCoercion.optional(),
  }),
});
//comnst 
const queryFuelLogSchema = z.object({
  query: z.object({
    vehicleId: z.string().regex(/^\d+$/, 'Vehicle ID must be an integer').transform(Number).optional(),
  }),
});

const createExpenseSchema = z.object({
  body: z.object({
    vehicle_id: z.number().int().positive('Vehicle ID must be a positive integer'),
    type: z.enum(['TOLL', 'FINE', 'PARKING', 'OTHER']),
    amount: z.number().nonnegative('Amount cannot be negative'),
    expense_date: dateCoercion.optional(),
    notes: z.string().max(200).optional(),
  }),
});

const queryExpenseSchema = z.object({
  query: z.object({
    vehicleId: z.string().regex(/^\d+$/, 'Vehicle ID must be an integer').transform(Number).optional(),
  }),
});

module.exports = {
  createFuelLogSchema,
  queryFuelLogSchema,
  createExpenseSchema,
  queryExpenseSchema,
};
