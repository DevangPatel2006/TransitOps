import axiosClient from './axiosClient';

/**
 * Get all drivers matching status and expiringBefore filters.
 */
export function getDrivers(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.expiringBefore) params.expiringBefore = filters.expiringBefore;
  if (filters.search) params.search = filters.search;
  return axiosClient.get('/drivers', { params });
}

/**
 * Get a single driver by ID.
 */
export function getDriverById(id) {
  return axiosClient.get(`/drivers/${id}`);
}

/**
 * Create a new driver.
 */
export function createDriver(data) {
  return axiosClient.post('/drivers', data);
}

/**
 * Update an existing driver by ID.
 */
export function updateDriver(id, data) {
  return axiosClient.put(`/drivers/${id}`, data);
}

/**
 * Update a driver's status (Safety Officer only).
 */
export function updateDriverStatus(id, status) {
  return axiosClient.put(`/drivers/${id}/status`, { status });
}
