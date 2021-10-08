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
      env: any;
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

export type ShowIf = string | ShowIfAnd | ShowIfOr | ShowIfNot;

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
