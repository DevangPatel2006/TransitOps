import axiosClient from './axiosClient';

/**
 * Get expiring licenses.
 * @param {number} days - Threshold window in days.
 */
export function getExpiringLicenses(days = 30) {
  return axiosClient.get('/notifications/expiring-licenses', {
    params: { days },
  });
}

/**
 * Manually trigger expiry reminder checks (calls email alerts log job).
 */
export function triggerExpiryCheck() {
  return axiosClient.post('/notifications/expiring-licenses/check');
}
