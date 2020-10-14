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
  kind: string,
  name: string,
  rawYaml: Object
}

export enum StorageType {
  Secret = 'secret',
  ConfigMap = 'configmap',
  Memory = 'memory'
}
