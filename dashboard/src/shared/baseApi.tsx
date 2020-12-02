import axios from 'axios';
import qs from 'qs';

axios.defaults.timeout = 10000;

// Partial function that accepts a generic params type and returns an api method
export const baseApi = <T extends {}, S = {}>(requestType: string, endpoint: ((pathParams: S) => string) | string) => {
  return (token: string, params: T, pathParams: S, callback?: (err: any, res: any) => void) => {

    // Generate endpoint literal
    let endpointString: ((pathParams: S) => string) | string;
    if (typeof endpoint === 'string') {
      endpointString = endpoint;
    } else {
      endpointString = endpoint(pathParams);
    }

    // Handle request type (can refactor)
    if (requestType === 'POST') {
      axios.post(endpointString, params, {
      headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        callback && callback(null, res);
      })
      .catch(err => {
        callback && callback(err, null);
      });
    } else if (requestType === 'PUT') {
      axios.put(endpointString, params, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        callback && callback(null, res);
      })
      .catch(err => {
        callback && callback(err, null);
      });
    } else if (requestType === 'DELETE') {
      axios.delete(endpointString, params)
      .then(res => {
        callback && callback(null, res);
      })
      .catch(err => {
        callback && callback(err, null);
      })
    } else {
      axios.get(endpointString, {
        params,
        paramsSerializer: function(params) {
          return qs.stringify(params, { arrayFormat: 'repeat' })
        }
      })
      .then(res => {
        callback && callback(null, res);
      })
      .catch(err => {
        callback && callback(err, null);
      });
    }
  }
}