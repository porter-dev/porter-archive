import axios, {
  AxiosError,
  AxiosPromise,
  AxiosRequestConfig,
  Method,
} from "axios";
import qs from "qs";
import { UnauthorizedPopupActions } from "./auth/UnauthorizedPopup";

type EndpointParam<PathParamsType> =
  | string
  | ((pathParams: PathParamsType) => string);

type BuildAxiosConfigFunction = (
  method: Method,
  endpoint: EndpointParam<unknown>,
  token: string,
  params: unknown,
  pathParams: unknown
) => AxiosRequestConfig;

const buildAxiosConfig: BuildAxiosConfigFunction = (
  method,
  endpoint,
  token,
  params,
  pathParams
) => {
  const config: AxiosRequestConfig = {
    method,
    url: typeof endpoint === "function" ? endpoint(pathParams) : endpoint,
  };

  if (method.toUpperCase() === "POST") {
    return {
      ...config,
      data: params,
    };
  }

  if (method.toUpperCase() === "PUT") {
    return {
      ...config,
      data: params,
    };
  }

  if (method.toUpperCase() === "DELETE") {
    const queryParams = qs.stringify(params, {
      arrayFormat: "repeat",
    });
    return {
      ...config,
      url: `${config.url}?${queryParams}`,
    };
  }

  if (method.toUpperCase() === "GET") {
    return {
      ...config,
      params: params,
      paramsSerializer: (params) =>
        qs.stringify(params, { arrayFormat: "repeat" }),
    };
  }

  if (method.toUpperCase() === "PATCH") {
    return {
      ...config,
      data: params,
    };
  }

  return config;
};

type Options = {
  disableUnauthorizedPopup?: boolean;
};

const apiQueryBuilder = <ParamsType extends {}, PathParamsType = {}>(
  method: Method = "GET",
  endpoint: EndpointParam<PathParamsType>,
  options?: Options
) => async <ResponseType = any>(
  token: string,
  params: ParamsType,
  pathParams: PathParamsType
) => {
  try {
    return axios(
      buildAxiosConfig(method, endpoint, token, params, pathParams)
    ) as AxiosPromise<ResponseType>;
  } catch (error) {
    const axiosError = error as AxiosError;

    if (options?.disableUnauthorizedPopup) {
      throw axiosError;
    }

    /**
     * Made concatenated if/else-if to avoid throwing the error if its 401 or 403
     *
     * Base idea here is to have a single place where we handle all the unauthorized errors.
     * If the error corresponds to 401 or 403, we show the unauthorized popup. Otherwise, we throw the error.
     *
     * This way, we avoid having to handle the error in every single place where we use the apiQueryBuilder
     * and the components can just handle the error they want.
     */
    if (axiosError.response?.status === 401) {
      UnauthorizedPopupActions.showUnauthorizedPopup(
        "Your session has expired. Please log in again."
      );
    } else if (axiosError.response?.status === 403) {
      UnauthorizedPopupActions.showUnauthorizedPopup(
        "You are not authorized to perform this action."
      );
    } else {
      throw error;
    }
  }
};

export { apiQueryBuilder as baseApi };
export default apiQueryBuilder;
