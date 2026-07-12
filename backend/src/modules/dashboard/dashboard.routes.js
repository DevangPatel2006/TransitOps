const express = require('express');
const { z } = require('zod');
const validate = require('../../utils/validators');
const dashboardController = require('./dashboard.controller');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

const kpiQuerySchema = z.object({
  query: z.object({
    type: z.enum(['TRUCK', 'VAN', 'BIKE', 'TRAILER']).optional(),
    region: z.string().optional(),
    status: z.string().optional(),
  }),
});

router.get('/kpis', validate(kpiQuerySchema), dashboardController.getKPIs);

module.exports = router;
