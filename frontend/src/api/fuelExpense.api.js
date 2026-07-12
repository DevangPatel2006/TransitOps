import axiosClient from './axiosClient';

/**
 * Get all fuel logs matching optional filters.
 */
export function getFuelLogs(filters = {}) {
  const params = {};
  if (filters.vehicleId) params.vehicleId = filters.vehicleId;
  return axiosClient.get('/fuel-logs', { params });
}

/**
 * Log a new fuel entry.
 */
export function createFuelLog(data) {
  return axiosClient.post('/fuel-logs', data);
}

/**
 * Get all expenses matching optional filters.
 */
export function getExpenses(filters = {}) {
  const params = {};
  if (filters.vehicleId) params.vehicleId = filters.vehicleId;
  return axiosClient.get('/expenses', { params });
}

/**
 * Create a new expense.
 */
export function createExpense(data) {
  return axiosClient.post('/expenses', data);
}
