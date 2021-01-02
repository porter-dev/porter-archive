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

const getIngress = baseApi<{
  cluster_id: number,
}, { name: string, namespace: string, id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/k8s/${pathParams.namespace}/ingress/${pathParams.name}`;
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

const getTemplateInfo = baseApi<{}, { name: string, version: string }>('GET', pathParams => {
  return `/api/templates/${pathParams.name}/${pathParams.version}`;
});

const getRepos = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/repos`;
});

const getBranches = baseApi<{}, { kind: string, repo: string }>('GET', pathParams => {
  return `/api/repos/${pathParams.kind}/${pathParams.repo}/branches`;
});

const getBranchContents = baseApi<{ 
  dir: string 
}, {
  kind: string,
  repo: string,
  branch: string
}>('GET', pathParams => {
  return `/api/repos/github/${pathParams.repo}/${pathParams.branch}/contents`;
});

const getProjects = baseApi<{}, { id: number }>('GET', pathParams => {
  return `/api/users/${pathParams.id}/projects`;
});

const getReleaseToken = baseApi<{ 
  namespace: string,
  cluster_id: number,
  storage: StorageType,
}, { name: string, id: number }>('GET', pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/webhook_token`;
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
  namespace: string,
  name: string,
}, { 
  id: number,
  cluster_id: number, 
  name: string, 
  version: string 
}>('POST', pathParams => {
  let { cluster_id, id, name, version } = pathParams;
  return `/api/projects/${id}/deploy/${name}/${version}?cluster_id=${cluster_id}`;
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
  aws_cluster_id?: string,
  aws_access_key_id: string,
  aws_secret_access_key: string,
}, { id: number }>('POST', pathParams => {
  return `/api/projects/${pathParams.id}/integrations/aws`;
});

const provisionECR = baseApi<{
  ecr_name: string,
  aws_integration_id: string,
}, { id: number }>('POST', pathParams => {
  return `/api/projects/${pathParams.id}/provision/ecr`;
});

const provisionEKS = baseApi<{
  eks_name: string,
  aws_integration_id: string,
}, { id: number }>('POST', pathParams => {
  return `/api/projects/${pathParams.id}/provision/eks`;
});

const createECR = baseApi<{
  name: string,
  aws_integration_id: string,
}, { id: number }>('POST', pathParams => {
  return `/api/projects/${pathParams.id}/registries`;
});

const getImageRepos = baseApi<{
}, {
  project_id: number, 
  registry_id: number 
}>('GET', pathParams => {
  return `/api/projects/${pathParams.project_id}/registries/${pathParams.registry_id}/repositories`;
});

const getImageTags = baseApi<{
}, {   
  project_id: number,
  registry_id: number,
  repo_name: string,
}>('GET', pathParams => {
  return `/api/projects/${pathParams.project_id}/registries/${pathParams.registry_id}/repositories/${pathParams.repo_name}`;
});

const linkGithubProject = baseApi<{
}, {
  project_id: number,
}>('GET', pathParams => {
  return `/api/oauth/projects/${pathParams.project_id}/github`;
});

const getGitRepos = baseApi<{  
}, {
  project_id: number,
}>('GET', pathParams => {
  return `/api/projects/${pathParams.project_id}/gitrepos`;
});

// Bundle export to allow default api import (api.<method> is more readable)
export default {
  linkGithubProject,
  getGitRepos,
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
  getIngress,
  getRevisions,
  rollbackChart,
  upgradeChartValues,
  getTemplates,
  getTemplateInfo,
  getBranches,
  getBranchContents,
  getProjects,
  getReleaseToken,
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
  provisionECR,
  provisionEKS,
  createECR,
  getImageRepos,
  getImageTags,
}