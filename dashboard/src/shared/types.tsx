export interface KubeContextConfig {
  cluster: string,
  name: string,
  selected?: boolean,
  server: string,
  user: string
}

export enum StorageType {
  Secret = 'secret',
  ConfigMap = 'configmap',
  Memory = 'memory'
}