const express = require('express');
const validate = require('../../utils/validators');
const {
  createDriverSchema,
  updateDriverSchema,
  queryDriverSchema,
  updateStatusSchema,
  idParamSchema,
} = require('./drivers.validators');
const driversController = require('./drivers.controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(queryDriverSchema), driversController.getDrivers);
router.post('/', requireRole('FLEET_MANAGER', 'SAFETY_OFFICER'), validate(createDriverSchema), driversController.createDriver);

router.get('/:id', validate(idParamSchema), driversController.getDriverById);
router.put('/:id', requireRole('FLEET_MANAGER', 'SAFETY_OFFICER'), validate(idParamSchema), validate(updateDriverSchema), driversController.updateDriver);
router.put('/:id/status', requireRole('SAFETY_OFFICER'), validate(idParamSchema), validate(updateStatusSchema), driversController.updateDriverStatus);

module.exports = router;
