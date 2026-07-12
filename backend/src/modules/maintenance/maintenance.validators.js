const { z } = require('zod');

const createMaintenanceSchema = z.object({
  body: z.object({
    vehicle_id: z.number().int().positive('Vehicle ID must be a positive integer'),
    description: z.string().min(1, 'Description is required').max(200),
    cost: z.number().nonnegative('Cost cannot be negative').optional(),
  }),
});

const queryMaintenanceSchema = z.object({
  query: z.object({
    vehicleId: z.string().regex(/^\d+$/, 'Vehicle ID must be an integer').transform(Number).optional(),
    status: z.enum(['OPEN', 'CLOSED']).optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

module.exports = {
  createMaintenanceSchema,
  queryMaintenanceSchema,
  idParamSchema,
};
