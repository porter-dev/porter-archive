export interface ClusterType {
  id: number;
  name: string;
  server: string;
  service_account_id: number;
  infra_id?: number;
  service?: string;
  aws_integration_id?: number;
}

export interface DetailedClusterType extends ClusterType {
  ingress_ip?: string;
  ingress_error?: DetailedIngressError;
}

export interface DetailedIngressError {
  message: string;
  error: string;
}

export interface ChartType {
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
    };
    files?: {
      data: string;
      name: string;
    }[];
  };
  form?: FormYAML;
  config: any;
  version: number;
  namespace: string;
  latest_version: string;
  tags: any;
}

export interface ChartTypeWithExtendedConfig extends ChartType {
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
        normal: {
          [key: string]: string;
        };
        build: {
          [key: string]: string;
        };
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
}

export interface ResourceType {
  ID: number;
  Kind: string;
  Name: string;
  RawYAML: any;
  Relations: any;
}

export interface NodeType {
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
}

export interface EdgeType {
  type: string;
  source: number;
  target: number;
}

export enum StorageType {
  Secret = "secret",
  ConfigMap = "configmap",
  Memory = "memory",
}

// PorterTemplate represents a bundled Porter template
export interface PorterTemplate {
  name: string;
  versions: string[];
  currentVersion: string;
  description: string;
  icon: string;
  repo_url?: string;
}

// FormYAML represents a chart's values.yaml form abstraction
export interface FormYAML {
  name?: string;
  icon?: string;
  description?: string;
  hasSource?: string;
  tags?: string[];
  tabs?: {
    name: string;
    label: string;
    sections?: Section[];
  }[];
}

export interface ShowIfAnd {
  and: ShowIf[];
}

export interface ShowIfOr {
  or: ShowIf[];
}

export interface ShowIfNot {
  not: ShowIf;
}

export interface ShowIfIs {
  variable: string;
  is: string;
}

export type ShowIf = string | ShowIfIs | ShowIfAnd | ShowIfOr | ShowIfNot;

export interface Section {
  name?: string;
  show_if?: ShowIf;
  contents: FormElement[];
}

// FormElement represents a form element
export interface FormElement {
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
}

export interface RepoType {
  FullName: string;
  kind: string;
  GHRepoID: number;
}

export interface FileType {
  path: string;
  type: string;
}

export interface ProjectType {
  id: number;
  name: string;
  preview_envs_enabled: boolean;
  enable_rds_databases: boolean;
  managed_infra_enabled: boolean;
  roles: {
    id: number;
    kind: string;
    user_id: number;
    project_id: number;
  }[];
}

export interface ChoiceType {
  value: string;
  label: string;
}

export interface ImageType {
  kind: string;
  source: string;
  registryId: number;
  name: string;
}

export interface InfraType {
  id: number;
  project_id: number;
  kind: string;
  status: string;
}

export interface InviteType {
  token: string;
  expired: boolean;
  email: string;
  accepted: boolean;
  id: number;
}

export interface ActionConfigType {
  git_repo: string;
  git_branch: string;
  image_repo_uri: string;
  git_repo_id: number;
}

export interface FullActionConfigType extends ActionConfigType {
  dockerfile_path: string;
  folder_path: string;
  registry_id: number;
  should_create_workflow: boolean;
}

export interface CapabilityType {
  github: boolean;
  provisioner: boolean;
}

export interface ContextProps {
  currentModal?: string;
  currentModalData: any;
  setCurrentModal: (currentModal: string, currentModalData?: any) => void;
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
  projects: ProjectType[];
  setProjects: (projects: ProjectType[]) => void;
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
}

export enum JobStatusType {
  Succeeded = "succeeded",
  Running = "active",
  Failed = "failed",
}

export interface JobStatusWithTimeType {
  status: JobStatusType;
  start_time: string;
}

export interface Usage {
  resource_cpu: number;
  resource_memory: number;
  clusters: number;
  users: number;
}

export interface UsageData {
  current: Usage & { [key: string]: number };
  limit: Usage & { [key: string]: number };
  exceeds: boolean;
  exceeded_since?: string;
}

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
  resources: {
    [key: string]: TFResourceState;
  };
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
  config: null | {
    [key: string]: string;
  };
};
