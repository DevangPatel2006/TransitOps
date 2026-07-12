const asyncHandler = require('../../utils/asyncHandler');
const driversService = require('./drivers.service');

const getDrivers = asyncHandler(async (req, res) => {
  const list = await driversService.getDrivers(req.query);
  res.status(200).json(list);
});

const createDriver = asyncHandler(async (req, res) => {
  const driver = await driversService.createDriver(req.body);
  res.status(201).json(driver);
});

const getDriverById = asyncHandler(async (req, res) => {
  const driver = await driversService.getDriverById(req.params.id);
  res.status(200).json(driver);
});

const updateDriver = asyncHandler(async (req, res) => {
  const driver = await driversService.updateDriver(req.params.id, req.body);
  res.status(200).json(driver);
});

const updateDriverStatus = asyncHandler(async (req, res) => {
  const driver = await driversService.updateDriverStatus(req.params.id, req.body.status);
  res.status(200).json(driver);
});

module.exports = {
  getDrivers,
  createDriver,
  getDriverById,
  updateDriver,
  updateDriverStatus,
};
