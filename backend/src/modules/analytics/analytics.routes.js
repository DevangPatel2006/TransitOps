const express = require('express');
const validate = require('../../utils/validators');
const {
  fleetUtilizationTrendSchema,
  costTrendSchema,
  fuelEfficiencyTrendSchema,
  tripVolumeSchema,
} = require('./analytics.validators');
const analyticsController = require('./analytics.controller');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/fleet-utilization-trend', validate(fleetUtilizationTrendSchema), analyticsController.getFleetUtilizationTrend);
router.get('/cost-trend', validate(costTrendSchema), analyticsController.getCostTrend);
router.get('/fuel-efficiency-trend', validate(fuelEfficiencyTrendSchema), analyticsController.getFuelEfficiencyTrend);
router.get('/trip-volume', validate(tripVolumeSchema), analyticsController.getTripVolume);

module.exports = router;
