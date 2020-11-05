export interface KubeContextConfig {
  cluster: string,
  name: string,
  selected?: boolean,
  server: string,
  user: string
}

export interface ChartType {
  name: string,
  info: {
    last_deployed: string,
    deleted: string,
    description: string,
    status: string
  },
  chart: {
    metadata: {
      name: string,
      home: string,
      sources: string,
      version: string,
      description: string,
      icon: string,
      apiVersion: string
    },
  },
  config: string,
  version: number,
  namespace: string
}

export interface ResourceType {
  ID: number,
  Kind: string,
  Name: string,
  RawYAML: Object,
  Relations: any
}

export interface NodeType {
  id: number,
  name: string,
  kind: string,
  RawYAML?: Object,
  x: number,
  y: number,
  w: number,
  h: number,
  toCursorX?: number,
  toCursorY?: number
}

export interface EdgeType {
  type: string,
  source: number,
  target: number
}

export enum StorageType {
  Secret = 'secret',
  ConfigMap = 'configmap',
  Memory = 'memory'
}

// PorterChart represents a bundled Porter template
export interface PorterChart {
	Name: string,
	Description: string,
	Icon: string,
  Form: FormYAML,
  Markdown?: string,
}

// FormYAML represents a chart's values.yaml form abstraction
export interface FormYAML {
	Name?: string,  
	Icon?: string,   
	Description?: string,   
	Tags?: string[],
  Sections?: Section[]
}

export interface Section {
  Name?: string,
  ShowIf?: string,
  Contents: FormElement[]
}

// FormElement represents a form element
export interface FormElement {
  Type: string,
  Label: string,
  Name?: string,
  Variable?: string,
  Settings?: {
    Default?: number | string | boolean,
    Options?: any[],
    Unit?: string
  }
}

export interface RepoType {
  FullName: string,
  kind: string
}

export interface FileType {
  Path: string,
  Type: string
}