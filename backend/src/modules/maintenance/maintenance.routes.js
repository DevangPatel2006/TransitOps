const express = require('express');
const validate = require('../../utils/validators');
const {
  createMaintenanceSchema,
  queryMaintenanceSchema,
  idParamSchema,
} = require('./maintenance.validators');
const maintenanceController = require('./maintenance.controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(queryMaintenanceSchema), maintenanceController.getMaintenanceLogs);
router.post('/', requireRole('FLEET_MANAGER'), validate(createMaintenanceSchema), maintenanceController.createMaintenance);
router.put('/:id/close', requireRole('FLEET_MANAGER'), validate(idParamSchema), maintenanceController.closeMaintenance);

module.exports = router;
