import axios from "axios";
import qs from "qs";

// axios.defaults.timeout = 10000;

// Partial function that accepts a generic params type and returns an api method
export const baseApi = <T extends {}, S = {}>(
  requestType: string,
  endpoint: ((pathParams: S) => string) | string
) => {
  return (token: string, params: T, pathParams: S) => {
    // Generate endpoint literal
    let endpointString: ((pathParams: S) => string) | string;
    if (typeof endpoint === "string") {
      endpointString = endpoint;
    } else {
      endpointString = endpoint(pathParams);
    }

    // Handle request type (can refactor)
    if (requestType === "POST") {
      return axios.post(endpointString, params, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } else if (requestType === "PUT") {
      return axios.put(endpointString, params, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } else if (requestType === "DELETE") {
      return axios.delete(endpointString, params);
    } else {
      return axios.get(endpointString, {
        params,
        paramsSerializer: function(params) {
          return qs.stringify(params, { arrayFormat: "repeat" });
        }
      });
    }
  };
};
