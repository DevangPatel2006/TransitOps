const asyncHandler = require('../../utils/asyncHandler');
const vehiclesService = require('./vehicles.service');

const getVehicles = asyncHandler(async (req, res) => {
  const list = await vehiclesService.getVehicles(req.query);
  res.status(200).json(list);
});

const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehiclesService.createVehicle(req.body);
  res.status(201).json(vehicle);
});

const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await vehiclesService.getVehicleById(req.params.id);
  res.status(200).json(vehicle);
});
//ID From data
const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehiclesService.updateVehicle(req.params.id, req.body);
  res.status(200).json(vehicle);
});

const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehiclesService.deleteVehicle(req.params.id);
  res.status(200).json({ message: 'Vehicle retired successfully', vehicle });
});

const getVehicleCosts = asyncHandler(async (req, res) => {
  const costs = await vehiclesService.getVehicleCosts(req.params.id);
  res.status(200).json(costs);
});

module.exports = {
  getVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehicleCosts,
};
