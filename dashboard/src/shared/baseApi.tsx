import axios from 'axios';

// Partial function that accepts a generic params type and returns an api method
export const baseApi = <T extends {}, S = {}>(requestType: string, endpoint: ((pathParams: S) => string) | string, baseUrlOverride?: string) => {
  return (token: string, params: T, pathParams: S, callback?: (err: any, res: any) => void) => {
    let baseUrl = (process as any).env.API_SERVER;
    if (baseUrlOverride) {
      baseUrl = baseUrlOverride;
    }

    // Generate endpoint literal
    let endpointString: ((pathParams: S) => string) | string;
    if (typeof endpoint === 'string') {
      endpointString = endpoint;
    } else {
      endpointString = endpoint(pathParams);
    }

    // Handle request type (can refactor)
    if (requestType === 'POST') {
      axios.post(`http://${baseUrl + endpointString}`, params, {
      headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        callback && callback(null, res.data);
      })
      .catch(err => {
        callback && callback(err, null);
      });
    } else if (requestType === 'PUT') {
      axios.put(`http://${baseUrl + endpointString}`, params, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        callback && callback(null, res.data);
      })
      .catch(err => {
        callback && callback(err, null);
      });
    } else {
      axios.get(`http://${baseUrl + endpointString}`, {
        withCredentials: true,
        params
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