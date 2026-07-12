const asyncHandler = require('../../utils/asyncHandler');
const tripsService = require('./trips.service');

const getTrips = asyncHandler(async (req, res) => {
  const list = await tripsService.getTrips(req.query);
  res.status(200).json(list);
});

const createTrip = asyncHandler(async (req, res) => {
  const trip = await tripsService.createTrip(req.body, req.user.user_id);
  res.status(201).json(trip);
});

const getTripById = asyncHandler(async (req, res) => {
  const trip = await tripsService.getTripById(req.params.id);
  res.status(200).json(trip);
});

const dispatchTrip = asyncHandler(async (req, res) => {
  const trip = await tripsService.dispatchTrip(req.params.id);
  res.status(200).json({ message: 'Trip dispatched successfully', trip });
});

const completeTrip = asyncHandler(async (req, res) => {
  const trip = await tripsService.completeTrip(req.params.id, req.body);
  res.status(200).json({ message: 'Trip completed successfully', trip });
});

const cancelTrip = asyncHandler(async (req, res) => {
  const trip = await tripsService.cancelTrip(req.params.id);
  res.status(200).json({ message: 'Trip cancelled successfully', trip });
});

module.exports = {
  getTrips,
  createTrip,
  getTripById,
  dispatchTrip,
  completeTrip,
  cancelTrip,
};
