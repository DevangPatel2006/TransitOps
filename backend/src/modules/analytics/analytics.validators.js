const { z } = require('zod');

const fleetUtilizationTrendSchema = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).default('30'),
  }),
});

const costTrendSchema = z.object({
  query: z.object({
    months: z.string().regex(/^\d+$/).transform(Number).default('6'),
  }),
});

const fuelEfficiencyTrendSchema = z.object({
  query: z.object({
    vehicleId: z.string().regex(/^\d+$/).transform(Number).optional(),
    months: z.string().regex(/^\d+$/).transform(Number).default('6'),
  }),
});

const tripVolumeSchema = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).default('30'),
  }),
});

module.exports = {
  fleetUtilizationTrendSchema,
  costTrendSchema,
  fuelEfficiencyTrendSchema,
  tripVolumeSchema,
};
