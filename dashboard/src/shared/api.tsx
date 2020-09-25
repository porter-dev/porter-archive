import { baseApi } from './baseApi';

const registerUser = baseApi<{ 
  email: string, 
  password: string 
}>('POST', '/api/register');

const logInUser = baseApi<{
  email: string,
  password: string
}>('POST', '/api/login');

const logOutUser = baseApi<{}>('GET', '/api/logout');

// Bundle export to allow default api import
export default {
  registerUser,
  logInUser,
  logOutUser
}