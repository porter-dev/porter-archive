import { baseApi } from "./baseApi";

import { StorageType } from "./types";

/**
 * Generic api call format
 * @param {string} token - Bearer token.
 * @param {Object} params - Body params.
 * @param {Object} pathParams - Path params.
 * @param {(err: Object, res: Object) => void} callback - Callback function.
 */

const checkAuth = baseApi("GET", "/api/auth/check");

const connectECRRegistry = baseApi<
  {
    name: string;
    aws_integration_id: string;
  },
  { id: number }
>("POST", pathParams => {
  return `/api/projects/${pathParams.id}/registries`;
});

const connectGCRRegistry = baseApi<
  {
    name: string;
    gcp_integration_id: string;
    url: string;
  },
  { id: number }
>("POST", pathParams => {
  return `/api/projects/${pathParams.id}/registries`;
});

const createAWSIntegration = baseApi<
  {
    aws_region: string;
    aws_cluster_id?: string;
    aws_access_key_id: string;
    aws_secret_access_key: string;
  },
  { id: number }
>("POST", pathParams => {
  return `/api/projects/${pathParams.id}/integrations/aws`;
});

const createDOCR = baseApi<
  {
    do_integration_id: number;
    docr_name: string;
    docr_subscription_tier: string;
  },
  {
    project_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/provision/docr`;
});

const createDOKS = baseApi<
  {
    do_integration_id: number;
    doks_name: string;
    do_region: string;
  },
  {
    project_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/provision/doks`;
});

const createEmailVerification = baseApi<{}, {}>("POST", pathParams => {
  return `/api/email/verify/initiate`;
});

const createGCPIntegration = baseApi<
  {
    gcp_region: string;
    gcp_key_data: string;
    gcp_project_id: string;
  },
  {
    project_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/integrations/gcp`;
});

const createGCR = baseApi<
  {
    gcp_integration_id: number;
  },
  {
    project_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/provision/gcr`;
});

const createGHAction = baseApi<
  {
    git_repo: string;
    registry_id: number;
    image_repo_uri: string;
    dockerfile_path: string;
    folder_path: string;
    git_repo_id: number;
    env: any;
  },
  {
    project_id: number;
    CLUSTER_ID: number;
    RELEASE_NAME: string;
    RELEASE_NAMESPACE: string;
  }
>("POST", pathParams => {
  let { project_id, CLUSTER_ID, RELEASE_NAME, RELEASE_NAMESPACE } = pathParams;
  return `/api/projects/${project_id}/ci/actions?cluster_id=${CLUSTER_ID}&name=${RELEASE_NAME}&namespace=${RELEASE_NAMESPACE}`;
});

const createGKE = baseApi<
  {
    gcp_integration_id: number;
    gke_name: string;
  },
  {
    project_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/provision/gke`;
});

const createInvite = baseApi<
  {
    email: string;
  },
  {
    id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.id}/invites`;
});

const createPasswordReset = baseApi<
  {
    email: string;
  },
  {}
>("POST", pathParams => {
  return `/api/password/reset/initiate`;
});

const createPasswordResetVerify = baseApi<
  {
    email: string;
    token: string;
    token_id: number;
  },
  {}
>("POST", pathParams => {
  return `/api/password/reset/verify`;
});

const createPasswordResetFinalize = baseApi<
  {
    email: string;
    token: string;
    token_id: number;
    new_password: string;
  },
  {}
>("POST", pathParams => {
  return `/api/password/reset/finalize`;
});

const createProject = baseApi<{ name: string }, {}>("POST", pathParams => {
  return `/api/projects`;
});

const createSubdomain = baseApi<
  {
    release_name: string;
  },
  {
    id: number;
    cluster_id: number;
  }
>("POST", pathParams => {
  let { cluster_id, id } = pathParams;

  return `/api/projects/${id}/k8s/subdomain?cluster_id=${cluster_id}`;
});

const deleteCluster = baseApi<
  {},
  {
    project_id: number;
    cluster_id: number;
  }
>("DELETE", pathParams => {
  return `/api/projects/${pathParams.project_id}/clusters/${pathParams.cluster_id}`;
});

const deleteGitRepoIntegration = baseApi<
  {},
  {
    project_id: number;
    git_repo_id: number;
  }
>("DELETE", pathParams => {
  return `/api/projects/${pathParams.project_id}/gitrepos/${pathParams.git_repo_id}`;
});

const deleteInvite = baseApi<{}, { id: number; invId: number }>(
  "DELETE",
  pathParams => {
    return `/api/projects/${pathParams.id}/invites/${pathParams.invId}`;
  }
);

const deleteProject = baseApi<{}, { id: number }>("DELETE", pathParams => {
  return `/api/projects/${pathParams.id}`;
});

const deleteRegistryIntegration = baseApi<
  {},
  {
    project_id: number;
    registry_id: number;
  }
>("DELETE", pathParams => {
  return `/api/projects/${pathParams.project_id}/registries/${pathParams.registry_id}`;
});

const deployTemplate = baseApi<
  {
    templateName: string;
    imageURL?: string;
    formValues?: any;
    storage: StorageType;
    namespace: string;
    name: string;
  },
  {
    id: number;
    cluster_id: number;
    name: string;
    version: string;
    repo_url?: string;
  }
>("POST", pathParams => {
  let { cluster_id, id, name, version, repo_url } = pathParams;

  if (repo_url) {
    return `/api/projects/${id}/deploy/${name}/${version}?cluster_id=${cluster_id}&repo_url=${repo_url}`;
  }
  return `/api/projects/${id}/deploy/${name}/${version}?cluster_id=${cluster_id}`;
});

const destroyCluster = baseApi<
  {
    eks_name: string;
  },
  {
    project_id: number;
    infra_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/infra/${pathParams.infra_id}/eks/destroy`;
});

const getBranchContents = baseApi<
  {
    dir: string;
  },
  {
    project_id: number;
    git_repo_id: number;
    kind: string;
    owner: string;
    name: string;
    branch: string;
  }
>("GET", pathParams => {
  return `/api/projects/${pathParams.project_id}/gitrepos/${pathParams.git_repo_id}/repos/${pathParams.kind}/${pathParams.owner}/${pathParams.name}/${pathParams.branch}/contents`;
});

const getBranches = baseApi<
  {},
  {
    project_id: number;
    git_repo_id: number;
    kind: string;
    owner: string;
    name: string;
  }
>("GET", pathParams => {
  return `/api/projects/${pathParams.project_id}/gitrepos/${pathParams.git_repo_id}/repos/${pathParams.kind}/${pathParams.owner}/${pathParams.name}/branches`;
});

const getChart = baseApi<
  {
    namespace: string;
    cluster_id: number;
    storage: StorageType;
  },
  { id: number; name: string; revision: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/${pathParams.revision}`;
});

const getCharts = baseApi<
  {
    namespace: string;
    cluster_id: number;
    storage: StorageType;
    limit: number;
    skip: number;
    byDate: boolean;
    statusFilter: string[];
  },
  { id: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/releases`;
});

const getChartComponents = baseApi<
  {
    namespace: string;
    cluster_id: number;
    storage: StorageType;
  },
  { id: number; name: string; revision: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/${pathParams.revision}/components`;
});

const getChartControllers = baseApi<
  {
    namespace: string;
    cluster_id: number;
    storage: StorageType;
  },
  { id: number; name: string; revision: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/${pathParams.revision}/controllers`;
});

const getClusterIntegrations = baseApi("GET", "/api/integrations/cluster");

const getClusters = baseApi<{}, { id: number }>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/clusters`;
});

const getGitRepoList = baseApi<
  {},
  {
    project_id: number;
    git_repo_id: number;
  }
>("GET", pathParams => {
  return `/api/projects/${pathParams.project_id}/gitrepos/${pathParams.git_repo_id}/repos`;
});

const getGitRepos = baseApi<
  {},
  {
    project_id: number;
  }
>("GET", pathParams => {
  return `/api/projects/${pathParams.project_id}/gitrepos`;
});

const getImageRepos = baseApi<
  {},
  {
    project_id: number;
    registry_id: number;
  }
>("GET", pathParams => {
  return `/api/projects/${pathParams.project_id}/registries/${pathParams.registry_id}/repositories`;
});

const getImageTags = baseApi<
  {},
  {
    project_id: number;
    registry_id: number;
    repo_name: string;
  }
>("GET", pathParams => {
  return `/api/projects/${pathParams.project_id}/registries/${pathParams.registry_id}/repositories/${pathParams.repo_name}`;
});

const getInfra = baseApi<
  {},
  {
    project_id: number;
  }
>("GET", pathParams => {
  return `/api/projects/${pathParams.project_id}/infra`;
});

const getIngress = baseApi<
  {
    cluster_id: number;
  },
  { name: string; namespace: string; id: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/k8s/${pathParams.namespace}/ingress/${pathParams.name}`;
});

const getInvites = baseApi<{}, { id: number }>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/invites`;
});

const getMatchingPods = baseApi<
  {
    cluster_id: number;
    selectors: string[];
  },
  { id: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/k8s/pods`;
});

const getMetrics = baseApi<
  {
    cluster_id: number;
    metric: string;
    shouldsum: boolean;
    pods: string[];
    namespace: string;
    startrange: number;
    endrange: number;
    resolution: string;
  },
  { id: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/k8s/metrics`;
});

const getNamespaces = baseApi<
  {
    cluster_id: number;
  },
  { id: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/k8s/namespaces`;
});

const getOAuthIds = baseApi<
  {},
  {
    project_id: number;
  }
>("GET", pathParams => {
  return `/api/projects/${pathParams.project_id}/integrations/oauth`;
});

const getProjectClusters = baseApi<{}, { id: number }>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/clusters`;
});

const getProjectRegistries = baseApi<{}, { id: number }>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/registries`;
});

const getProjectRepos = baseApi<{}, { id: number }>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/repos`;
});

const getProjects = baseApi<{}, { id: number }>("GET", pathParams => {
  return `/api/users/${pathParams.id}/projects`;
});

const getPrometheusIsInstalled = baseApi<
  {
    cluster_id: number;
  },
  { id: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/k8s/prometheus/detect`;
});

const getRegistryIntegrations = baseApi("GET", "/api/integrations/registry");

const getReleaseToken = baseApi<
  {
    namespace: string;
    cluster_id: number;
    storage: StorageType;
  },
  { name: string; id: number }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/webhook_token`;
});

const destroyEKS = baseApi<
  {
    eks_name: string;
  },
  {
    project_id: number;
    infra_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/infra/${pathParams.infra_id}/eks/destroy`;
});

const destroyGKE = baseApi<
  {
    gke_name: string;
  },
  {
    project_id: number;
    infra_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/infra/${pathParams.infra_id}/gke/destroy`;
});

const destroyDOKS = baseApi<
  {
    doks_name: string;
  },
  {
    project_id: number;
    infra_id: number;
  }
>("POST", pathParams => {
  return `/api/projects/${pathParams.project_id}/infra/${pathParams.infra_id}/doks/destroy`;
});

const getRepoIntegrations = baseApi("GET", "/api/integrations/repo");

const getRepos = baseApi<{}, { id: number }>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/repos`;
});

const getRevisions = baseApi<
  {
    namespace: string;
    cluster_id: number;
    storage: StorageType;
  },
  { id: number; name: string }
>("GET", pathParams => {
  return `/api/projects/${pathParams.id}/releases/${pathParams.name}/history`;
});

const getTemplateInfo = baseApi<
  {
    repo_url?: string;
  },
  { name: string; version: string }
>("GET", pathParams => {
  return `/api/templates/${pathParams.name}/${pathParams.version}`;
});

const getAddonTemplates = baseApi("GET", "/api/templates");

const getApplicationTemplates = baseApi<
  {
    repo_url?: string;
  },
  {}
>("GET", "/api/templates");

const getUser = baseApi<{}, { id: number }>("GET", pathParams => {
  return `/api/users/${pathParams.id}`;
});

const linkGithubProject = baseApi<
  {},
  {
    project_id: number;
  }
>("GET", pathParams => {
  return `/api/oauth/projects/${pathParams.project_id}/github`;
});

const logInUser = baseApi<{
  email: string;
  password: string;
}>("POST", "/api/login");

const logOutUser = baseApi("POST", "/api/logout");

const provisionECR = baseApi<
  {
    ecr_name: string;
    aws_integration_id: string;
  },
  { id: number }
>("POST", pathParams => {
  return `/api/projects/${pathParams.id}/provision/ecr`;
});

const provisionEKS = baseApi<
  {
    eks_name: string;
    aws_integration_id: string;
  },
  { id: number }
>("POST", pathParams => {
  return `/api/projects/${pathParams.id}/provision/eks`;
});

const registerUser = baseApi<{
  email: string;
  password: string;
}>("POST", "/api/users");

const rollbackChart = baseApi<
  {
    namespace: string;
    storage: StorageType;
    revision: number;
  },
  {
    id: number;
    name: string;
    cluster_id: number;
  }
>("POST", pathParams => {
  let { id, name, cluster_id } = pathParams;
  return `/api/projects/${id}/releases/${name}/rollback?cluster_id=${cluster_id}`;
});

const uninstallTemplate = baseApi<
  {},
  {
    id: number;
    name: string;
    cluster_id: number;
    namespace: string;
    storage: StorageType;
  }
>("POST", pathParams => {
  let { id, name, cluster_id, storage, namespace } = pathParams;
  return `/api/projects/${id}/delete/${name}?cluster_id=${cluster_id}&namespace=${namespace}&storage=${storage}`;
});

const updateUser = baseApi<
  {
    rawKubeConfig?: string;
    allowedContexts?: string[];
  },
  { id: number }
>("PUT", pathParams => {
  return `/api/users/${pathParams.id}`;
});

const upgradeChartValues = baseApi<
  {
    namespace: string;
    storage: StorageType;
    values: string;
  },
  {
    id: number;
    name: string;
    cluster_id: number;
  }
>("POST", pathParams => {
  let { id, name, cluster_id } = pathParams;
  return `/api/projects/${id}/releases/${name}/upgrade?cluster_id=${cluster_id}`;
});

// Bundle export to allow default api import (api.<method> is more readable)
export default {
  checkAuth,
  connectECRRegistry,
  connectGCRRegistry,
  createAWSIntegration,
  createDOCR,
  createDOKS,
  createEmailVerification,
  createGCPIntegration,
  createGCR,
  createGHAction,
  createGKE,
  createInvite,
  createPasswordReset,
  createPasswordResetVerify,
  createPasswordResetFinalize,
  createProject,
  deleteCluster,
  deleteGitRepoIntegration,
  deleteInvite,
  deleteProject,
  deleteRegistryIntegration,
  createSubdomain,
  deployTemplate,
  destroyEKS,
  destroyGKE,
  destroyDOKS,
  getBranchContents,
  getBranches,
  getChart,
  getCharts,
  getChartComponents,
  getChartControllers,
  getClusterIntegrations,
  getClusters,
  getGitRepoList,
  getGitRepos,
  getImageRepos,
  getImageTags,
  getInfra,
  getIngress,
  getInvites,
  getMatchingPods,
  getMetrics,
  getNamespaces,
  getOAuthIds,
  getProjectClusters,
  getProjectRegistries,
  getProjectRepos,
  getProjects,
  getPrometheusIsInstalled,
  getRegistryIntegrations,
  getReleaseToken,
  getRepoIntegrations,
  getRepos,
  getRevisions,
  getTemplateInfo,
  getAddonTemplates,
  getApplicationTemplates,
  getUser,
  linkGithubProject,
  logInUser,
  logOutUser,
  provisionECR,
  provisionEKS,
  registerUser,
  rollbackChart,
  uninstallTemplate,
  updateUser,
  upgradeChartValues
};
