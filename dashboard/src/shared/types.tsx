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
  version: number,
  namespace: string
}

export enum StorageType {
  Secret = 'secret',
  ConfigMap = 'configmap',
  Memory = 'memory'
}