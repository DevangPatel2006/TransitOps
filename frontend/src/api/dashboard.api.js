import axiosClient from './axiosClient';

/**
 * GET /dashboard/kpis?type=&status=&region=
 * Returns: { activeVehicles, availableVehicles, inMaintenance, activeTrips, pendingTrips, driversOnDuty, fleetUtilizationPct }
 */
export function fetchKpis(filters = {}) {
  const params = {};
  if (filters.type) params.type = filters.type;
  if (filters.status) params.status = filters.status;
  if (filters.region) params.region = filters.region;
  return axiosClient.get('/dashboard/kpis', { params });
}

/**
 * GET /trips — recent trips for the dashboard (latest ~5).
 * The backend returns all trips; we take the newest 5 client-side.
 */
export function fetchRecentTrips() {
  return axiosClient.get('/trips');
}

/**
 * GET /vehicles — used to compute status distribution for the bar chart.
 */
export function fetchVehicles() {
  return axiosClient.get('/vehicles');
}
