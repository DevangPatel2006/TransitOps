const express = require('express');
const validate = require('../../utils/validators');
const {
  createTripSchema,
  completeTripSchema,
  queryTripSchema,
  idParamSchema,
} = require('./trips.validators');
const tripsController = require('./trips.controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.use(authenticate);
//auth checked
router.get('/', validate(queryTripSchema), tripsController.getTrips);
router.post('/', requireRole('FLEET_MANAGER', 'DRIVER_OPS'), validate(createTripSchema), tripsController.createTrip);

router.get('/:id', validate(idParamSchema), tripsController.getTripById);
router.post('/:id/dispatch', requireRole('FLEET_MANAGER', 'DRIVER_OPS'), validate(idParamSchema), tripsController.dispatchTrip);
router.post('/:id/complete', requireRole('FLEET_MANAGER', 'DRIVER_OPS'), validate(idParamSchema), validate(completeTripSchema), tripsController.completeTrip);
router.post('/:id/cancel', requireRole('FLEET_MANAGER', 'DRIVER_OPS'), validate(idParamSchema), tripsController.cancelTrip);

module.exports = router;
