const express = require('express');
const { z } = require('zod');
const validate = require('../../utils/validators');
const reportsController = require('./reports.controller');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

const exportQuerySchema = z.object({
  query: z.object({
    type: z.enum(['vehicles', 'drivers', 'trips', 'costs']),
  }),
});

router.get('/fuel-efficiency', reportsController.getFuelEfficiency);
router.get('/utilization', reportsController.getUtilization);
router.get('/roi', reportsController.getROI);
router.get('/export.csv', validate(exportQuerySchema), reportsController.exportCsv);

module.exports = router;
//routes checked