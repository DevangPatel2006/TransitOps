const express = require('express');
const validate = require('../../utils/validators');
const {
  createVehicleSchema,
  updateVehicleSchema,
  queryVehicleSchema,
  idParamSchema,
} = require('./vehicles.validators');
const vehiclesController = require('./vehicles.controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(queryVehicleSchema), vehiclesController.getVehicles);
router.post('/', requireRole('FLEET_MANAGER'), validate(createVehicleSchema), vehiclesController.createVehicle);

router.get('/:id', validate(idParamSchema), vehiclesController.getVehicleById);
router.put('/:id', requireRole('FLEET_MANAGER'), validate(idParamSchema), validate(updateVehicleSchema), vehiclesController.updateVehicle);
router.delete('/:id', requireRole('FLEET_MANAGER'), validate(idParamSchema), vehiclesController.deleteVehicle);
router.get('/:id/costs', validate(idParamSchema), vehiclesController.getVehicleCosts);

module.exports = router;
