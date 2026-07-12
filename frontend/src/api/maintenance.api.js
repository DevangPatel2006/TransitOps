import axiosClient from './axiosClient';

/**
 * Get all maintenance logs matching optional filters.
 */
export function getMaintenanceLogs(filters = {}) {
  const params = {};
  if (filters.vehicleId) params.vehicleId = filters.vehicleId;
  if (filters.status) params.status = filters.status;
  return axiosClient.get('/maintenance', { params });
}

/**
 * Create a new maintenance record (Log Service Record).
 */
export function createMaintenance(data) {
  return axiosClient.post('/maintenance', data);
}

/**
 * Close a maintenance record.
 */
export function closeMaintenance(id) {
  return axiosClient.put(`/maintenance/${id}/close`);
}
