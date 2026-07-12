const asyncHandler = require('../../utils/asyncHandler');
const maintenanceService = require('./maintenance.service');

const getMaintenanceLogs = asyncHandler(async (req, res) => {
  const logs = await maintenanceService.getMaintenanceLogs(req.query);
  res.status(200).json(logs);
});

const createMaintenance = asyncHandler(async (req, res) => {
  const log = await maintenanceService.createMaintenance(req.body);
  res.status(201).json(log);
});

const closeMaintenance = asyncHandler(async (req, res) => {
  const log = await maintenanceService.closeMaintenance(req.params.id);
  res.status(200).json({ message: 'Maintenance record closed successfully', log });
});

module.exports = {
  getMaintenanceLogs,
  createMaintenance,
  closeMaintenance,
};
