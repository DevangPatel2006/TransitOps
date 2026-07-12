const { z } = require('zod');

const createVehicleSchema = z.object({
  body: z.object({
    registration_no: z.string().min(1, 'Registration number is required').max(30),
    name_model: z.string().min(1, 'Name/Model is required').max(100),
    type: z.enum(['TRUCK', 'VAN', 'BIKE', 'TRAILER']),
    max_load_capacity: z.number().positive('Max load capacity must be greater than 0'),
    odometer: z.number().nonnegative('Odometer reading cannot be negative').optional(),
    acquisition_cost: z.number().nonnegative('Acquisition cost cannot be negative'),
    region: z.string().max(60).nullable().optional(),
    status: z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED']).optional(),
  }),
});

const updateVehicleSchema = z.object({
  body: z.object({
    registration_no: z.string().min(1).max(30).optional(),
    name_model: z.string().min(1).max(100).optional(),
    type: z.enum(['TRUCK', 'VAN', 'BIKE', 'TRAILER']).optional(),
    max_load_capacity: z.number().positive().optional(),
    odometer: z.number().nonnegative().optional(),
    acquisition_cost: z.number().nonnegative().optional(),
    region: z.string().max(60).nullable().optional(),
    status: z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED']).optional(),
  }),
});

const queryVehicleSchema = z.object({
  query: z.object({
    status: z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED']).optional(),
    type: z.enum(['TRUCK', 'VAN', 'BIKE', 'TRAILER']).optional(),
    region: z.string().optional(),
    search: z.string().optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

module.exports = {
  createVehicleSchema,
  updateVehicleSchema,
  queryVehicleSchema,
  idParamSchema,
};
