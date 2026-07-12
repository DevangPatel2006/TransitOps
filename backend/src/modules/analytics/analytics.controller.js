const asyncHandler = require('../../utils/asyncHandler');
const analyticsService = require('./analytics.service');

const getFleetUtilizationTrend = asyncHandler(async (req, res) => {
  const trend = await analyticsService.getFleetUtilizationTrend(req.query.days);
  res.status(200).json(trend);
});

const getCostTrend = asyncHandler(async (req, res) => {
  const trend = await analyticsService.getCostTrend(req.query.months);
  res.status(200).json(trend);
});

const getFuelEfficiencyTrend = asyncHandler(async (req, res) => {
  const { vehicleId, months } = req.query;
  const trend = await analyticsService.getFuelEfficiencyTrend(vehicleId, months);
  res.status(200).json(trend);
});

const getTripVolume = asyncHandler(async (req, res) => {
  const trend = await analyticsService.getTripVolumeTrend(req.query.days);
  res.status(200).json(trend);
});

module.exports = {
  getFleetUtilizationTrend,
  getCostTrend,
  getFuelEfficiencyTrend,
  getTripVolume,
};
