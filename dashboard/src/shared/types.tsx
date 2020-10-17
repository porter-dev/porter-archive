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
