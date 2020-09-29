import axios from 'axios';
import { baseApi } from './baseApi';

/**
 * Generic api call format
 * @param {string} token - Bearer token.
 * @param {Object} params - Query params.
 * @param {Object} pathParams - Path params.
 * @param {(err: Object, res: Object) => void} callback - Callback function.
 */

const registerUser = baseApi<{ 
  email: string, 
  password: string
}>('POST', '/api/register');

const logInUser = baseApi<{
  email: string,
  password: string
}>('POST', '/api/login');

const logOutUser = baseApi<{}>('GET', '/api/logout');

const getClusters = baseApi<{}, { id: number }>('GET', (pathParams) => {
  return `/api/users/${pathParams.id}/clusters`;
});

// Bundle export to allow default api import
export default {
  registerUser,
  logInUser,
  logOutUser,
  getClusters
}