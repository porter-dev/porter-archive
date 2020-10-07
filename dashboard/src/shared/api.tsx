import axios from 'axios';
import { baseApi } from './baseApi';

import { StorageType } from './types';

/**
 * Generic api call format
 * @param {string} token - Bearer token.
 * @param {Object} params - Body params.
 * @param {Object} pathParams - Path params.
 * @param {(err: Object, res: Object) => void} callback - Callback function.
 */

const checkAuth = baseApi('GET', '/api/auth/check');

const registerUser = baseApi<{ 
  email: string, 
  password: string
}>('POST', '/api/users');

const logInUser = baseApi<{
  email: string,
  password: string
}>('POST', '/api/login');

const logOutUser = baseApi('POST', '/api/logout');

const getUser = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/users/${pathParams.id}`;
});

const updateUser = baseApi<{
  rawKubeConfig?: string,
  allowedContexts?: string[]
}, { id: number }>('PUT', pathParams => {
  return `/api/users/${pathParams.id}`;
});

const getContexts = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/users/${pathParams.id}/contexts`;
});

const getCharts = baseApi<{
  user_id: number,
  helm: {
    namespace: string,
    context: string,
    storage: string
  },
  filter: {
    namespace: string,
    limit: number,
    skip: number,
    byDate: boolean,
    statusFilter: string[]
  }
}>('GET', '/api/charts');

// Bundle export to allow default api import (api.<method> is more readable)
export default {
  checkAuth,
  registerUser,
  logInUser,
  logOutUser,
  getUser,
  updateUser,
  getContexts,
  getCharts,
}