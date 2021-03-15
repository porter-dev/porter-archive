export interface ClusterType {
  id: number;
  name: string;
  server: string;
  service_account_id: number;
  infra_id?: number;
  service?: string;
}

export interface ChartType {
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
  Memory = "memory"
}

// PorterTemplate represents a bundled Porter template
export interface PorterTemplate {
  name: string;
  version: string;
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

export interface Section {
  name?: string;
  show_if?: string;
  contents: FormElement[];
}

// FormElement represents a form element
export interface FormElement {
  type: string;
  label: string;
  required?: boolean;
  name?: string;
  variable?: string;
  value?: any;
  settings?: {
    default?: number | string | boolean;
    options?: any[];
    unit?: string;
  };
}

export interface RepoType {
  FullName: string;
  kind: string;
  GHRepoID: number;
}

export interface FileType {
  Path: string;
  Type: string;
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
  image_repo_uri: string;
  git_repo_id: number;
}
