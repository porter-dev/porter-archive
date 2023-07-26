import { z } from "zod";

const dependencyValidator = z.object({
  name: z.string(),
  version: z.string(),
  repository: z.string(),
  enabled: z.boolean(),
  alias: z.string(),
});

const autoScalingValidator = z.object({
  enabled: z.boolean().default(false),
  minReplicas: z.coerce.number().default(1),
  maxReplicas: z.coerce.number().default(10),
  targetCPUUtilizationPercentage: z.coerce.number().default(50),
  targetMemoryUtilizationPercentage: z.coerce.number().default(50),
});

const cloudsqlValidator = z.object({
  connectionName: z.string(),
  dbPort: z.coerce.number().default(5432),
  enabled: z.boolean().default(false),
  serviceAccountJSON: z.string(),
});

const baseChartValidator = z.object({
  container: z.object({
    command: z.string().nullable().default(null),
    env: z.object({
      normal: z.record(z.string(), z.string()).nullable().default(null),
    }),
    port: z.coerce.number().default(80),
  }),
  global: z.object({
    image: z.object({
      repository: z.string(),
      tag: z.string(),
    }),
  }),
  hostAliases: z.array(z.unknown()),
  image: z.object({
    pullPolicy: z.string(),
    repository: z.string(),
    tag: z.string(),
  }),
  nodeSelector: z.object({}),
  resources: z.object({
    requests: z.object({
      cpu: z.string(),
      memory: z.string(),
    }),
  }),
  replicaCount: z.coerce.number().default(1),
  serviceAccount: z.object({
    create: z.boolean().default(false),
    name: z.string(),
    annotations: z.object({}),
  }),
  stack: z.object({
    enabled: z.boolean().default(false),
    name: z.string(),
    revision: z.number().default(0),
  }),
  terminationGracePeriodSeconds: z.number().default(30),
  tolerations: z.array(z.unknown()),
});

export const jobChartValidator = baseChartValidator.extend({
  allowConcurrency: z.boolean().default(true),
  auto_deploy: z.boolean().default(true),
  cloudsql: cloudsqlValidator,
  paused: z.boolean().default(false),
  retainFailedHooks: z.boolean().default(false),
  schedule: z.object({
    enabled: z.boolean().default(false),
    failedHistory: z.number().default(20),
    successfulHistory: z.number().default(20),
    value: z.string(),
  }),
  sidecar: z
    .object({
      resources: z.object({
        requests: z.object({
          cpu: z.string(),
          memory: z.string(),
        }),
      }),
    })
    .optional(),
});

export type JobChart = z.infer<typeof jobChartValidator>;

const workerHealthProbeValidator = z.object({
  command: z.string().default("ls -l"),
  enabled: z.boolean().default(false),
  failureThreshold: z.coerce.number().default(3),
  initialDelaySeconds: z.number().default(5),
  periodSeconds: z.number().default(5),
});

export const workerChartValidator = baseChartValidator.extend({
  autoscaling: autoScalingValidator,
  cloudsql: cloudsqlValidator,
  emptyDir: z.object({
    enabled: z.boolean().default(false),
    mountPath: z.string().default("/mypath"),
  }),
  health: z.object({
    command: z.string().default("ls -l"),
    enabled: z.boolean().default(false),
    failureThreshold: z.coerce.number().default(3),
    periodSeconds: z.number().default(5),
    livenessProbe: workerHealthProbeValidator,
    readinessProbe: workerHealthProbeValidator,
    startupProbe: workerHealthProbeValidator,
  }),
  keda: z.object({
    cooldownPeriod: z.number().default(300),
    enabled: z.boolean().default(false),
    fallback: z.object({
      failureReplicas: z.coerce.number().default(6),
      failureThreshold: z.coerce.number().default(3),
    }),
    hpa: z.object({
      scaleDown: z.object({
        policy: z.object({
          periodSeconds: z.number().default(300),
          value: z.number().default(10),
        }),
        stabilizationWindowSeconds: z.number().default(300),
      }),
      scaleUp: z.object({
        policy: z.object({
          periodSeconds: z.number().default(300),
          value: z.number().default(10),
        }),
        stabilizationWindowSeconds: z.number().default(300),
      }),
    }),
    maxReplicaCount: z.number().default(10),
    minReplicaCount: z.number().default(1),
    pollingInterval: z.number().default(30),
    trigger: z.object({
      metricName: z.string(),
      metricQuery: z.string(),
      metricThreshold: z.string(),
    }),
    triggers: z.array(z.unknown()),
  }),
  podLabels: z.object({}),
  pvc: z.object({
    enabled: z.boolean().default(false),
    mountPath: z.string().default("/mypath"),
    storage: z.string().default("20Gi"),
  }),
  topology: z.object({
    enabled: z.boolean().default(false),
    labelSelector: z.object({
      enabled: z.boolean().default(false),
      matchLabels: z.object({}),
    }),
  }),
});

export type WorkerChart = z.infer<typeof workerChartValidator>;

const webHealthProbeValidator = z.object({
  auth: z.object({
    enabled: z.boolean().default(false),
    password: z.string(),
    username: z.string(),
  }),
  enabled: z.boolean().default(false),
  failureThreshold: z.coerce.number().default(3),
  httpHeaders: z.array(z.unknown()),
  initialDelaySeconds: z.number().default(0),
  periodSeconds: z.number().default(5),
  scheme: z.string().default("HTTP"),
  timeoutSeconds: z.number().default(1),
});

const webChartValidator = baseChartValidator.extend({
  albIngress: z.object({
    custom_paths: z.array(z.unknown()),
    enabled: z.boolean().default(false),
    hosts: z.array(z.string()),
    scheme: z.string().default("internet-facing"),
    target_type: z.string().default("ip"),
  }),
  autoscaling: autoScalingValidator,
  auto_deploy: z.boolean().default(true),
  bluegreen: z.object({
    disablePrimaryDeployment: z.boolean().default(false),
    enabled: z.boolean().default(false),
    imageTags: z.array(z.string()),
  }),
  cloudsql: cloudsqlValidator,
  customNodePort: z.object({
    enabled: z.boolean().default(false),
    port: z.number().default(30000),
  }),
  datadog: z.object({
    enabled: z.boolean().default(false),
  }),
  emptyDir: z.object({
    enabled: z.boolean().default(false),
    mountPath: z.string().default("/mypath"),
  }),
  health: z.object({
    livenessCommand: z.object({
      command: z.string().default("ls -l"),
      enabled: z.boolean().default(false),
      failureThreshold: z.coerce.number().default(3),
      initialDelaySeconds: z.number().default(5),
      periodSeconds: z.number().default(5),
      successThreshold: z.number().default(1),
      timeoutSeconds: z.number().default(1),
    }),
    livenessProbe: webHealthProbeValidator.extend({
      initialDelaySeconds: z.number().default(0),
      path: z.string().default("/livez"),
      successThreshold: z.number().default(1),
    }),
    readinessProbe: webHealthProbeValidator.extend({
      initialDelaySeconds: z.number().default(0),
      path: z.string().default("/readyz"),
      successThreshold: z.number().default(1),
    }),
    startupProbe: webHealthProbeValidator.extend({
      path: z.string().default("/readyz"),
    }),
  }),
  ingress: z.object({
    annotations: z.object({}),
    customTls: z.object({
      enabled: z.boolean().default(false),
    }),
    custom_domain: z.boolean().default(false),
    custom_paths: z.array(z.unknown()),
    enabled: z.boolean().default(false),
    hosts: z.array(z.string()),
    porter_hosts: z.array(z.string()),
    provider: z.string().default("aws"),
    rewriteCustomPathsEnabled: z.boolean().default(true),
    tls: z.boolean().default(true),
    useDefaultIngressTLSSecret: z.boolean().default(false),
    wildcard: z.boolean().default(false),
  }),
  keda: z.object({
    cooldownPeriod: z.number().default(300),
    enabled: z.boolean().default(false),
    fallback: z.object({
      failureReplicas: z.coerce.number().default(6),
      failureThreshold: z.coerce.number().default(3),
    }),
    hpa: z.object({
      scaleDown: z.object({
        policy: z.object({
          periodSeconds: z.number().default(300),
          type: z.string().default("Percent"),
          value: z.number().default(10),
        }),
        stabilizationWindowSeconds: z.number().default(300),
      }),
      scaleUp: z.object({
        policy: z.object({
          periodSeconds: z.number().default(300),
          type: z.string().default("Percent"),
          value: z.number().default(10),
        }),
        stabilizationWindowSeconds: z.number().default(300),
      }),
    }),
    maxReplicaCount: z.number().default(10),
    minReplicaCount: z.number().default(1),
    pollingInterval: z.number().default(30),
    trigger: z.object({
      metricName: z.string(),
      metricQuery: z.string(),
      metricThreshold: z.string(),
      metricType: z.string().default("AverageValue"),
    }),
    triggers: z.array(z.unknown()),
  }),
  podLabels: z.object({}),
  privateIngress: z.object({
    annotations: z.object({}),
    clusterIssuer: z.string().default("letsencrypt-prod-private"),
    custom_paths: z.array(z.unknown()),
    enabled: z.boolean().default(false),
    hosts: z.array(z.unknown()),
    tls: z.boolean().default(false),
  }),
  pvc: z.object({
    enabled: z.boolean().default(false),
    existingVolume: z.string(),
    mountPath: z.string().default("/mypath"),
    storage: z.string().default("20Gi"),
  }),
  service: z.object({ port: z.number().default(80) }),

  stack: z.object({
    enabled: z.boolean(),
    name: z.string(),
    revision: z.number(),
  }),
  statefulset: z.object({ enabled: z.boolean() }),
  terminationGracePeriodSeconds: z.number(),
  tolerations: z.array(z.unknown()),
  topology: z.object({
    enabled: z.boolean().default(false),
    labelSelector: z.object({
      enabled: z.boolean().default(false),
      matchLabels: z.object({}),
    }),
  }),
});

export type WebChart = z.infer<typeof webChartValidator>;

export const umbrellaChartValidator = z.object({
  name: z.string(),
  info: z.object({
    first_deployed: z.string().datetime(),
    last_deployed: z.string().datetime(),
    deleted: z.string(),
    description: z.string(),
    status: z.string(),
  }),
  chart: z.object({
    metadata: z.object({
      name: z.string(),
      home: z.string().url(),
      version: z.string(),
      description: z.string(),
      keywords: z.array(z.string()),
      icon: z.string().url(),
      apiVersion: z.string(),
      dependencies: z.array(dependencyValidator),
      type: z.string(),
    }),
    values: z.record(
      z.string(),
      z.union([jobChartValidator, webChartValidator, workerChartValidator])
    ),
  }),
  config: z.record(
    z.string(),
    z.union([
      jobChartValidator.deepPartial(),
      webChartValidator.deepPartial(),
      workerChartValidator.deepPartial(),
    ])
  ),
  manifest: z.string(),
  hooks: z.array(
    z.object({
      events: z.array(z.string()),
      name: z.string(),
      weight: z.number().optional(),
      manifest: z.string(),
      path: z.string(),
      last_run: z.object({
        started_at: z.string(),
        completed_at: z.string(),
        phase: z.string(),
      }),
      delete_policies: z.array(z.string()).optional(),
    })
  ),
  version: z.number(),
  namespace: z.string(),
  id: z.number(),
  webhook_token: z.string(),
  latest_version: z.string(),
  image_repo_uri: z.string(),
  stack_id: z.string(),
  canonical_name: z.string(),
});

export type UmbrellaChart = z.infer<typeof umbrellaChartValidator>;
