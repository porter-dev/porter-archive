import axios, { AxiosPromise, AxiosRequestConfig, Method } from "axios";
import qs from "qs";

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

const apiQueryBuilder = <ParamsType extends {}, PathParamsType = {}>(
  method: Method = "GET",
  endpoint: EndpointParam<PathParamsType>
) => <ResponseType = any>(
  token: string,
  params: ParamsType,
  pathParams: PathParamsType
) =>
  axios(
    buildAxiosConfig(method, endpoint, token, params, pathParams)
  ) as AxiosPromise<ResponseType>;

export { apiQueryBuilder as baseApi };
export default apiQueryBuilder;
