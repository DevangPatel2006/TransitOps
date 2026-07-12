import axiosClient from './axiosClient';

/**
 * Register a new user account.
 * @param {object} data - { full_name, email, password, role }
 */
export function registerUser(data) {
  return axiosClient.post('/auth/register', data);
}
