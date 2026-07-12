import axiosClient from './axiosClient';

/**
 * Get fuel efficiency report data for all vehicles.
 */
export function getFuelEfficiency() {
  return axiosClient.get('/reports/fuel-efficiency');
}

/**
 * Get fleet utilization percentage statistics.
 */
export function getUtilization() {
  return axiosClient.get('/reports/utilization');
}

/**
 * Get vehicle return on investment (ROI) metric calculations.
 */
export function getRoi() {
  return axiosClient.get('/reports/roi');
}

/**
 * Export specific dataset (vehicles, drivers, trips, costs) as a CSV string.
 * Uses axios client to handle responseType properly so that it returns raw data/blob.
 */
export function exportReportCsv(type) {
  return axiosClient.get('/reports/export.csv', {
    params: { type },
    responseType: 'blob', // critical for file downloads
  });
}

/**
 * Export specific dataset (vehicles, drivers, trips, costs) as a PDF document.
 */
export function exportReportPdf(type) {
  return axiosClient.get('/reports/export/pdf', {
    params: { type },
    responseType: 'blob', // critical for file downloads
  });
}
