import { z } from "zod";

export const clusterValidator = z.object({
  id: z.number(),
  name: z.string(),
  vanity_name: z.string().optional(),
  server: z.string(),
  service_account_id: z.number().optional(),
  agent_integration_enabled: z.boolean().optional(),
  infra_id: z.number().optional(),
  service: z.string().optional(),
  aws_integration_id: z.number().optional(),
  aws_cluster_id: z.string().optional(),
  preview_envs_enabled: z.boolean().optional(),
  cloud_provider_credential_identifier: z.string().optional(),
  status: z.string().optional(),
  cloud_provider: z.string(),
  gpuCluster: z.boolean().optional(),
});

export type ClusterType = {
  id: number;
  name: string;
  vanity_name?: string;
  server?: string;
  service_account_id?: number;
  agent_integration_enabled?: boolean;
  infra_id?: number;
  service?: string;
  aws_integration_id?: number;
  aws_cluster_id?: string;
  preview_envs_enabled?: boolean;
  cloud_provider_credential_identifier?: string;
  status?: string;
  cloud_provider: string;
  gpuCluster?: boolean;
};

export const NilCluster: ClusterType = {
  id: -1,
  name: "",
  server: "",
  service_account_id: -1,
  infra_id: -1,
  service: "",
  agent_integration_enabled: false,
  aws_cluster_id: "",
  aws_integration_id: 0,
  cloud_provider: "",
  cloud_provider_credential_identifier: "",
  gpuCluster: false,
  preview_envs_enabled: false,
  status: "",
  vanity_name: "",
};

export type AddonCard = {
  id: string;
  icon: string;
  name: string;
  description: string;
};

export type DetailedClusterType = {
  ingress_ip?: string;
  ingress_error?: DetailedIngressError;
} & ClusterType;

export type DetailedIngressError = {
  message: string;
  error: string;
};
export type Annotations = {
  category: string;
};

export type ChartType = {
  stack_id: string;
  image_repo_uri: string;
  git_action_config: any;
  build_config: BuildConfig;
  name: string;
  info: {
    last_deployed: string;
    deleted: string;
    description: string;
    status: string;
  };
  chart: {
    metadata: {
      name: string;
      home: string;
      sources: string;
      version: string;
      description: string;
      icon: string;
      apiVersion: string;
      annotations?: Annotations;
    };
    files?: Array<{
      data: string;
      name: string;
    }>;
  };
  form?: FormYAML;
  config: any;
  version: number;
  namespace: string;
  latest_version: string;
  tags: any;
  canonical_name: string;
};

export type ChartTypeWithExtendedConfig = {
  config: {
    auto_deploy: boolean;
    autoscaling: {
      enabled: boolean;
      maxReplicas: number;
      minReplicas: number;
      targetCPUUtilizationPercentage: number;
      targetMemoryUtilizationPercentage: number;
    };
    cloudsql: {
      connectionName: string;
      dbPort: number;
      enabled: boolean;
      serviceAccountJSON: string;
    };
    container: {
      command: string;
      env: {
        normal: Record<string, string>;
        build: Record<string, string>;
        synced: any;
      };
      lifecycle: { postStart: string; preStop: string };
      port: number;
    };
    currentCluster: {
      service: { is_aws: boolean; is_do: boolean; is_gcp: boolean };
    };
    health: {
      enabled: boolean;
      failureThreshold: number;
      path: string;
      periodSeconds: number;
    };
    image: {
      pullPolicy: string;
      repository: string;
      tag: string;
    };
    ingress: {
      annotations: any;
      custom_domain: boolean;
      custom_paths: any[];
      enabled: boolean;
      hosts: any[];
      porter_hosts: string[];
      provider: string;
      wildcard: boolean;
    };
    pvc: { enabled: boolean; mountPath: string; storage: string };
    replicaCount: number;
    resources: { requests: { cpu: string; memory: string } };
    service: { port: number };
    serviceAccount: { annotations: any; create: boolean; name: string };
    showStartCommand: boolean;
    statefulset: { enabled: boolean };
    terminationGracePeriodSeconds: number;
    schedule: {
      enabled: boolean;
      value: string;
    };
  };
} & ChartType;

export type ResourceType = {
  ID: number;
  Kind: string;
  Name: string;
  RawYAML: any;
  Relations: any;
};

export type NodeType = {
  id: number;
  name: string;
  kind: string;
  RawYAML?: any;
  x: number;
  y: number;
  w: number;
  h: number;
  toCursorX?: number;
  toCursorY?: number;
};

export type EdgeType = {
  type: string;
  source: number;
  target: number;
};

export enum StorageType {
  Secret = "secret",
  ConfigMap = "configmap",
  Memory = "memory",
}

// PorterTemplate represents a bundled Porter template
export type PorterTemplate = {
  name: string;
  versions: string[];
  currentVersion: string;
  description: string;
  icon: string;
  repo_url?: string;
  tags?: string[];
};

export type ExpandedPorterTemplate = {
  form: FormYAML;
  markdown: string;
  metadata: ChartType["chart"]["metadata"];
  values: ChartTypeWithExtendedConfig["config"];
};

// FormYAML represents a chart's values.yaml form abstraction
export type FormYAML = {
  name?: string;
  icon?: string;
  description?: string;
  hasSource?: string;
  tags?: string[];
  tabs?: Array<{
    name: string;
    label: string;
    sections?: Section[];
  }>;
};

export type ShowIfAnd = {
  and: ShowIf[];
};

export type ShowIfOr = {
  or: ShowIf[];
};

export type ShowIfNot = {
  not: ShowIf;
};

export type ShowIfIs = {
  variable: string;
  is: string;
};

export type ShowIf = string | ShowIfIs | ShowIfAnd | ShowIfOr | ShowIfNot;

export type Section = {
  name?: string;
  show_if?: ShowIf;
  contents: FormElement[];
};

// FormElement represents a form element
export type FormElement = {
  type: string;
  info?: string;
  label: string;
  required?: boolean;
  name?: string;
  variable?: string;
  placeholder?: string;
  value?: any;
  settings?: {
    docs?: string;
    default?: number | string | boolean;
    options?: any[];
    omitUnitFromValue?: boolean;
    disableAfterLaunch?: boolean;
    unit?: string;
  };
};

export type RepoType = {
  FullName: string;
} & (
    | {
      Kind: "github";
      GHRepoID: number;
    }
    | {
      Kind: "gitlab";
      GitIntegrationId: number;
    }
  );

export type FileType = {
  path: string;
  type: string;
};
export type ProjectListType = {
  id: number;
  name: string;
};

export type ProjectType = {
  id: number;
  name: string;
  advanced_infra_enabled: boolean;
  api_tokens_enabled: boolean;
  azure_enabled: boolean;
  beta_features_enabled: boolean;
  billing_enabled: boolean;
  capi_provisioner_enabled: boolean;
  db_enabled: boolean;
  efs_enabled: boolean;
  enable_rds_databases: boolean;
  enable_reprovision: boolean;
  full_add_ons: boolean;
  gpu_enabled: boolean;
  helm_values_enabled: boolean;
  managed_infra_enabled: boolean;
  multi_cluster: boolean;
  preview_envs_enabled: boolean;
  quota_increase: boolean;
  simplified_view_enabled: boolean;
  soc2_controls_enabled: boolean;
  stacks_enabled: boolean;
  validate_apply_v2: boolean;
  managed_deployment_targets_enabled: boolean;
  aws_ack_auth_enabled: boolean;
  sandbox_enabled: boolean;
  advanced_rbac_enabled: boolean;
  roles: Array<{
    id: number;
    kind: string;
    user_id: number;
    project_id: number;
  }>;
};

export type ChoiceType = {
  value: string;
  label: string;
};

export type ImageType = {
  kind: string;
  source: string;
  registryId: number;
  name: string;
};

export type InfraType = {
  id: number;
  project_id: number;
  kind: string;
  status: string;
};

export type InviteType = {
  token: string;
  expired: boolean;
  email: string;
  accepted: boolean;
  id: number;
};

export type ActionConfigType = {
  git_repo: string;
  git_branch: string;
  image_repo_uri: string;
  dockerfile_path?: string;
} & (
    | {
      kind: "gitlab";
      gitlab_integration_id: number;
    }
    | {
      kind: "github";
      git_repo_id: number;
    }
  );

export type GithubActionConfigType = ActionConfigType & {
  kind: "github";
};

export type FullActionConfigType = ActionConfigType & {
  dockerfile_path: string;
  folder_path: string;
  registry_id: number;
  should_create_workflow: boolean;
};

export type FullGithubActionConfigType = GithubActionConfigType & {
  dockerfile_path: string;
  folder_path: string;
  registry_id: number;
  should_create_workflow: boolean;
};

export type CapabilityType = {
  github: boolean;
  provisioner: boolean;
  version?: string;
  default_app_helm_repo_url?: string;
  default_addon_helm_repo_url?: string;
};

export type ContextProps = {
  currentModal?: string;
  currentModalData: any;
  setCurrentModal: (currentModal: any, currentModalData?: any) => void;
  currentOverlay: {
    message: string;
    onYes: any;
    onNo: any;
  };
  setCurrentOverlay: (x: any) => void;
  currentError?: string;
  setCurrentError: (currentError: string) => void;
  currentCluster?: ClusterType;
  setCurrentCluster: (currentCluster: ClusterType, callback?: any) => void;
  currentProject?: ProjectType;
  setCurrentProject: (currentProject: ProjectType, callback?: any) => void;
  projects: ProjectListType[];
  setProjects: (projects: ProjectListType[]) => void;
  user: any;
  setUser: (userId: number, email: string) => void;
  devOpsMode: boolean;
  setDevOpsMode: (devOpsMode: boolean) => void;
  capabilities: CapabilityType;
  setCapabilities: (capabilities: CapabilityType) => void;
  clearContext: () => void;
  edition: "ee" | "ce";
  setEdition: (appVersion: string) => void;
  hasBillingEnabled: boolean;
  setHasBillingEnabled: (isBillingEnabled: boolean) => void;
  usage: UsageData;
  setUsage: (usage: UsageData) => void;
  queryUsage: () => Promise<void>;
  hasFinishedOnboarding: boolean;
  setHasFinishedOnboarding: (onboardingStatus: boolean) => void;
  canCreateProject: boolean;
  setCanCreateProject: (canCreateProject: boolean) => void;
  enableGitlab: boolean;
  setEnableGitlab: (enableGitlab: boolean) => void;
  shouldRefreshClusters: boolean;
  setShouldRefreshClusters: (shouldRefreshClusters: boolean) => void;
  soc2Data: any;
  setSoc2Data: (x: any) => void;
};

export enum JobStatusType {
  Succeeded = "succeeded",
  Running = "active",
  Failed = "failed",
}

export type JobStatusWithTimeType = {
  status: JobStatusType;
  start_time: string;
};

export type Usage = {
  resource_cpu: number;
  resource_memory: number;
  clusters: number;
  users: number;
};

export type UsageData = {
  current: Usage & Record<string, number>;
  limit: Usage & Record<string, number>;
  exceeds: boolean;
  exceeded_since?: string;
};

export type KubeEvent = {
  cluster_id: number;
  event_type: string;
  id: number;
  message: string;
  name: string;
  namespace: string;
  owner_name: string;
  owner_type: string;
  project_id: number;
  reason: string;
  resource_type: string;
  timestamp: string;
  sub_events: any[];
};

export type InfraKind =
  | "ecr"
  | "eks"
  | "rds"
  | "s3"
  | "gke"
  | "gcr"
  | "gar"
  | "doks"
  | "docr"
  | "aks"
  | "acr"
  | "test";

export type OperationStatus = "starting" | "completed" | "errored";

export type OperationType =
  | "create"
  | "update"
  | "delete"
  | "retry_create"
  | "retry_delete";

export type Infrastructure = {
  id: number;
  name?: string;
  api_version: string;
  created_at: string;
  updated_at: string;
  project_id: number;
  kind: InfraKind;
  status: string;
  aws_integration_id: number;
  do_integration_id: number;
  gcp_integration_id: number;
  latest_operation: Operation;
  source_link: string;
  source_version: string;
};

export type Operation = {
  id: string;
  infra_id: number;
  type: OperationType;
  status: OperationStatus;
  errored: boolean;
  error: string;
  last_applied: any;
  last_updated: string;
  form: any;
};

export type ProviderInfoMap = {
  [key in InfraKind]: {
    provider: string;
    source: string;
    resource_name: string;
    resource_link: string;
    provider_name: string;
  };
};

export type TFResourceStatus =
  | "planned_create"
  | "planned_delete"
  | "planned_update"
  | "created"
  | "creating"
  | "updating"
  | "deleting"
  | "deleted"
  | "errored";

export type TFResourceState = {
  id: string;
  status: TFResourceStatus;
  error?: string;
};

export type TFStateStatus = "created" | "deleted" | "errored";

export type TFState = {
  last_updated: string;
  operation_id: string;
  status: TFResourceStatus;
  resources: Record<string, TFResourceState>;
};

export const KindMap: ProviderInfoMap = {
  ecr: {
    provider: "aws",
    source: "porter/aws/ecr",
    resource_name: "Registry",
    resource_link: "/integrations/registry",
    provider_name: "Elastic Container Registry (ECR)",
  },
  eks: {
    provider: "aws",
    source: "porter/aws/eks",
    resource_name: "Cluster",
    resource_link: "/dashboard",
    provider_name: "Elastic Kubernetes Service (EKS)",
  },
  rds: {
    provider: "aws",
    source: "porter/aws/rds",
    resource_name: "Database",
    resource_link: "/databases",
    provider_name: "Relational Database Service (RDS)",
  },
  s3: {
    provider: "aws",
    source: "porter/aws/s3",
    resource_name: "S3 Bucket",
    resource_link: "/",
    provider_name: "AWS S3 Bucket",
  },
  gcr: {
    provider: "gcp",
    source: "porter/gcp/gcr",
    resource_name: "Registry",
    resource_link: "/integrations/registry",
    provider_name: "Google Container Registry (GCR)",
  },
  gar: {
    provider: "gcp",
    source: "porter/gcp/gar",
    resource_name: "Registry",
    resource_link: "/integrations/registry",
    provider_name: "Google Artifact Registry (GAR)",
  },
  gke: {
    provider: "gcp",
    source: "porter/gcp/gke",
    resource_name: "Cluster",
    resource_link: "/dashboard",
    provider_name: "Google Kubernetes Engine (GKE)",
  },
  docr: {
    provider: "aws",
    source: "porter/do/docr",
    resource_name: "Registry",
    resource_link: "/integrations/registry",
    provider_name: "Digital Ocean Container Registry (DOCR)",
  },
  doks: {
    provider: "aws",
    source: "porter/do/doks",
    resource_name: "Cluster",
    resource_link: "/dashboard",
    provider_name: "Digital Ocean Kubernetes Service (DOKS)",
  },
  aks: {
    provider: "azure",
    source: "porter/azure/aks",
    resource_name: "Cluster",
    resource_link: "/dashboard",
    provider_name: "Azure Kubernetes Service (AKS)",
  },
  acr: {
    provider: "azure",
    source: "porter/azure/acr",
    resource_name: "Registry",
    resource_link: "/integrations/registry",
    provider_name: "Azure Container Registry (ACR)",
  },
  test: {
    provider: "aws",
    source: "porter/test",
    resource_name: "Test",
    resource_link: "/dashboard",
    provider_name: "Testing",
  },
};

export type InfraTemplateMeta = {
  icon?: string;
  description: string;
  name: string;
  kind: string;
  version?: string;
  required_credential: InfraCredentialOptions;
};

export type InfraTemplate = {
  icon?: string;
  description: string;
  name: string;
  kind: string;
  version?: string;
  form: any;
  required_credential: InfraCredentialOptions;
};

export type InfraCredentialOptions =
  | "aws_integration_id"
  | "gcp_integration_id"
  | "do_integration_id"
  | "azure_integration_id"
  | "";

export type InfraCredentials = {
  [key in InfraCredentialOptions]?: number;
};

export type BuildConfig = {
  builder: string;
  buildpacks: string[];
  config: null | Record<string, string>;
};

export type CreateUpdatePorterAppOptions = {
  porter_yaml: string;
  porter_yaml_path?: string;
  repo_name?: string;
  git_branch?: string;
  git_repo_id?: number;
  build_context?: string;
  builder?: string;
  buildpacks?: string;
  dockerfile?: string;
  image_repo_uri?: string;
  image_info?: {
    repository: string;
    tag: string;
  };
  override_release?: boolean;
  full_helm_values?: string;
};

export type ClusterState = {
  clusterName: string;
  awsRegion: string;
  machineType: string;
  ecrScanningEnabled: boolean;
  guardDutyEnabled: boolean;
  kmsEncryptionEnabled: boolean;
  loadBalancerType: boolean;
  wildCardDomain: string;
  IPAllowList: string;
  wafV2Enabled: boolean;
  awsTags: string;
  wafV2ARN: string;
  certificateARN: string;
  minInstances: number;
  maxInstances: number;
  additionalNodePolicies: string[];
  cidrRangeVPC: string;
  cidrRangeServices: string;
  clusterVersion: string;
  gpuInstanceType?: string;
  gpuMinInstances: number;
  gpuMaxInstances: number;
  complianceProfiles: {
    soc2: boolean;
    hipaa: boolean;
  };
};

export type Soc2Check = {
  message: string;
  enabled: boolean;
  hideToggle?: boolean;
  status: string;
  disabledTooltip?: string;
  link?: string;
  locked?: boolean;
  enabledField?: string;
  info?: string;
};

export type Soc2Data = {
  soc2_checks: Record<string, Soc2Check>;
};
