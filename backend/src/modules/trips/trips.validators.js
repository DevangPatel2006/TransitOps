const { z } = require('zod');

const createTripSchema = z.object({
  body: z.object({
    source: z.string().min(1, 'Source is required').max(120),
    destination: z.string().min(1, 'Destination is required').max(120),
    vehicle_id: z.number().int().positive('Vehicle ID must be a positive integer'),
    driver_id: z.number().int().positive('Driver ID must be a positive integer'),
    cargo_weight: z.number().positive('Cargo weight must be greater than 0'),
    planned_distance: z.number().positive('Planned distance must be greater than 0'),
  }),
});

const completeTripSchema = z.object({
  body: z.object({
    final_odometer: z.number().nonnegative('Final odometer reading cannot be negative'),
    fuel_consumed: z.number().nonnegative('Fuel consumed cannot be negative'),
    revenue: z.number().nonnegative('Revenue cannot be negative'),
  }),
});

const queryTripSchema = z.object({
  query: z.object({
    status: z.enum(['DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED']).optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

module.exports = {
  createTripSchema,
  completeTripSchema,
  queryTripSchema,
  idParamSchema,
};
