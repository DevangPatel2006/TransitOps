import axiosClient from './axiosClient';

/**
 * Get all vehicles matching search, type, status, and region filters.
 */
export function getVehicles(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.type) params.type = filters.type;
  if (filters.region) params.region = filters.region;
  if (filters.search) params.search = filters.search;
  return axiosClient.get('/vehicles', { params });
}

/**
 * Get a single vehicle by ID.
 */
export function getVehicleById(id) {
  return axiosClient.get(`/vehicles/${id}`);
}

/**
 * Create a new vehicle.
 */
export function createVehicle(data) {
  return axiosClient.post('/vehicles', data);
}

/**
 * Update an existing vehicle by ID.
 */
export function updateVehicle(id, data) {
  return axiosClient.put(`/vehicles/${id}`, data);
}

/**
 * Retire a vehicle (calls soft-delete DELETE /vehicles/:id).
 */
export function deleteVehicle(id) {
  return axiosClient.delete(`/vehicles/${id}`);
}
