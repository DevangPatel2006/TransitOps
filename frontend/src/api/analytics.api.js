import axiosClient from './axiosClient';

/**
 * Get fleet utilization trend.
 * @param {number} days - Number of days in the trend.
 */
export function getFleetUtilizationTrend(days = 7) {
  return axiosClient.get('/analytics/fleet-utilization-trend', {
    params: { days },
  });
}

/**
 * Get monthly operational cost trend.
 * @param {number} months - Number of months in the trend.
 */
export function getCostTrend(months = 6) {
  return axiosClient.get('/analytics/cost-trend', {
    params: { months },
  });
}

/**
 * Get fuel efficiency trend.
 * @param {number} months - Number of months in the trend.
 * @param {number} [vehicleId] - Optional vehicle ID to filter.
 */
export function getFuelEfficiencyTrend(months = 6, vehicleId) {
  const params = { months };
  if (vehicleId) params.vehicleId = vehicleId;
  return axiosClient.get('/analytics/fuel-efficiency-trend', { params });
}

/**
 * Get trip volume trend.
 * @param {number} days - Number of days in the trend.
 */
export function getTripVolume(days = 7) {
  return axiosClient.get('/analytics/trip-volume', {
    params: { days },
  });
}
