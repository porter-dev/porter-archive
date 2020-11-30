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

const getClusters = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/clusters`;
});

const getCharts = baseApi<{
  namespace: string,
  cluster_id: number,
  storage: StorageType,
  limit: number,
  skip: number,
  byDate: boolean,
  statusFilter: string[]
}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/releases`;
});

const getChart = baseApi<{
  namespace: string,
  cluster_id: number,
  storage: StorageType
}, { id: number, name: string, revision: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/${pathParams.revision}`;
});

const getChartComponents = baseApi<{
  namespace: string,
  cluster_id: number,
  storage: StorageType
}, { id: number, name: string, revision: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/${pathParams.revision}/components`;
});

const getChartControllers = baseApi<{
  namespace: string,
  cluster_id: number,
  storage: StorageType
}, { id: number, name: string, revision: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/${pathParams.revision}/controllers`;
});

const getNamespaces = baseApi<{
  cluster_id: number,
}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/k8s/namespaces`;
});

const getMatchingPods = baseApi<{
  cluster_id: number,
  selectors: string[]
}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/k8s/pods`;
});

const getRevisions = baseApi<{
  namespace: string,
  cluster_id: number,
  storage: StorageType
}, { id: number, name: string }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/history`;
});

const rollbackChart = baseApi<{
  namespace: string,
  storage: StorageType,
  revision: number
}, {
  id: number,
  name: string,
  cluster_id: number,
  }>('POST', pathParams => {
  let { id, name, cluster_id } = pathParams;
  return `/api/projects/${id}/releases/${name}/rollback?cluster_id=${cluster_id}`;
});

const upgradeChartValues = baseApi<{
  namespace: string,
  storage: StorageType,
  values: string
}, {
  id: number,
  name: string,
  cluster_id: number,
  }>('POST', pathParams => {
  let { id, name, cluster_id } = pathParams;
  return `/api/projects/${id}/releases/${name}/upgrade?cluster_id=${cluster_id}`;
});

const getTemplates = baseApi('GET', '/api/templates');

const getRepos = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/repos`;
});

const getBranches = baseApi<{}, { kind: string, repo: string }>('GET', pathParams => {
  return `/api/repos/${pathParams.kind}/${pathParams.repo}/branches`;
});

const getBranchContents = baseApi<{ dir: string }, {
  kind: string,
  repo: string,
  branch: string
}>('GET', pathParams => {
  return `/api/repos/github/${pathParams.repo}/${pathParams.branch}/contents`;
});

const getProjects = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/users/${pathParams.id}/projects`;
});

const createProject = baseApi<{ name: string }, {}>('POST', pathParams => {
  return `/api/projects`;
});

const deleteProject = baseApi<{}, { id: number }>('DELETE', pathParams => {
  return `/api/projects/${pathParams.id}`;
});

const deployTemplate = baseApi<{
  templateName: string,
  imageURL: string,
  formValues: any,
  storage: StorageType,
}, { id: number, cluster_id: number }>('POST', pathParams => {
  let { cluster_id, id } = pathParams;
  return `/api/projects/${id}/deploy?cluster_id=${cluster_id}`;
});

const getClusterIntegrations = baseApi('GET', '/api/integrations/cluster');

const getRegistryIntegrations = baseApi('GET', '/api/integrations/registry');

const getRepoIntegrations = baseApi('GET', '/api/integrations/repo');

const getProjectClusters = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/clusters`;
});

const getProjectRegistries = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/registries`;
});

const getProjectRepos = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/repos`;
});

const createAWSIntegration = baseApi<{
  aws_region: string,
  aws_access_key_id: string,
  aws_secret_access_key: string,
}, { id: number }>('POST', pathParams => {
  return `/api/projects/${pathParams.id}/integrations/aws`;
});

const createECR = baseApi<{
  name: string,
  aws_integration_id: string,
}, { id: number }>('POST', pathParams => {
  return `/api/projects/${pathParams.id}/registries`;
});

const listRepositories = baseApi<{}, {   
  project_id: number,
  registry_id: number,
 }>('GET', pathParams => {
  return `/api/projects/${pathParams.project_id}/registries/${pathParams.registry_id}/repositories`;
});

// Bundle export to allow default api import (api.<method> is more readable)
export default {
  checkAuth,
  registerUser,
  logInUser,
  logOutUser,
  getRepos,
  getUser,
  updateUser,
  getClusters,
  getCharts,
  getChart,
  getChartComponents,
  getChartControllers,
  getNamespaces,
  getMatchingPods,
  getRevisions,
  rollbackChart,
  upgradeChartValues,
  getTemplates,
  getBranches,
  getBranchContents,
  getProjects,
  createProject,
  deleteProject,
  deployTemplate,
  getClusterIntegrations,
  getRegistryIntegrations,
  getRepoIntegrations,
  getProjectClusters,
  getProjectRegistries,
  getProjectRepos,
  createAWSIntegration,
  createECR,
  listRepositories,
}