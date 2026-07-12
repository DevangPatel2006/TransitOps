import axiosClient from './axiosClient';

/**
 * Get all trips matching search and filters.
 */
export function getTrips(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  return axiosClient.get('/trips', { params });
}

/**
 * Create a new trip (Draft).
 */
export function createTrip(data) {
  return axiosClient.post('/trips', data);
}

/**
 * Dispatch a trip.
 */
export function dispatchTrip(id) {
  return axiosClient.post(`/trips/${id}/dispatch`);
}

/**
 * Complete a trip.
 * @param {object} completionData - { final_odometer, fuel_consumed, revenue }
 */
export function completeTrip(id, completionData) {
  return axiosClient.post(`/trips/${id}/complete`, completionData);
}

/**
 * Cancel a trip.
 */
export function cancelTrip(id) {
  return axiosClient.post(`/trips/${id}/cancel`);
}
