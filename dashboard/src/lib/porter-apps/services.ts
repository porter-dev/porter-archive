import { PorterApp, Service, ServiceType } from "@porter-dev/api-contracts";
import { match } from "ts-pattern";
import { z } from "zod";

import { BuildOptions } from "./build";
import {
  autoscalingValidator,
  deserializeAutoscaling,
  deserializeHealthCheck,
  domainsValidator,
  healthcheckValidator,
  ingressAnnotationsValidator,
  serializeAutoscaling,
  SerializedAutoscaling,
  SerializedHealthcheck,
  serializeHealth,
  serviceBooleanValidator,
  ServiceField,
  serviceNumberValidator,
  serviceStringValidator,
} from "./values";
import _ from "lodash";

export type DetectedServices = {
  services: ClientService[];
  predeploy?: ClientService;
  build?: BuildOptions;
  previews?: {
    services: ClientService[];
    predeploy?: ClientService;
    variables?: Record<string, string>;
  };
};
type ClientServiceType = "web" | "worker" | "job" | "predeploy";

const webConfigValidator = z.object({
  type: z.literal("web"),
  autoscaling: autoscalingValidator.optional(),
  domains: domainsValidator,
  healthCheck: healthcheckValidator.optional(),
  private: serviceBooleanValidator.optional(),
  ingressAnnotations: ingressAnnotationsValidator.default([]),
});
export type ClientWebConfig = z.infer<typeof webConfigValidator>;

const workerConfigValidator = z.object({
  type: z.literal("worker"),
  autoscaling: autoscalingValidator.optional(),
});
export type ClientWorkerConfig = z.infer<typeof workerConfigValidator>;

const jobConfigValidator = z.object({
  type: z.literal("job"),
  allowConcurrent: serviceBooleanValidator.optional(),
  cron: serviceStringValidator,
  suspendCron: serviceBooleanValidator.optional(),
  timeoutSeconds: serviceNumberValidator,
});
export type ClientJobConfig = z.infer<typeof jobConfigValidator>;

const predeployConfigValidator = z.object({
  type: z.literal("predeploy"),
});
export type ClientPredeployConfig = z.infer<typeof predeployConfigValidator>;

// serviceValidator is the validator for a ClientService
// This is used to validate a service when creating or updating an app
export const serviceValidator = z.object({
  expanded: z.boolean().default(false).optional(),
  canDelete: z.boolean().default(true).optional(),
  name: serviceStringValidator,
  run: serviceStringValidator,
  instances: serviceNumberValidator,
  port: serviceNumberValidator,
  cpuCores: serviceNumberValidator,
  ramMegabytes: serviceNumberValidator,
  smartOptimization: serviceBooleanValidator.optional(),
  config: z.discriminatedUnion("type", [
    webConfigValidator,
    workerConfigValidator,
    jobConfigValidator,
    predeployConfigValidator,
  ]),
  domainDeletions: z
    .object({
      name: z.string(),
    })
    .array()
    .default([]),
  ingressAnnotationDeletions: z
    .object({
      key: z.string(),
    })
    .array()
    .default([]),
});

export type ClientService = z.infer<typeof serviceValidator>;

// SerializedService is just the values of a Service without any override information
// This is used as an intermediate step to convert a ClientService to a protobuf Service
export type SerializedService = {
  name: string;
  run: string;
  instances: number;
  port: number;
  cpuCores: number;
  ramMegabytes: number;
  smartOptimization?: boolean;
  config:
    | {
        type: "web";
        domains: {
          name: string;
        }[];
        autoscaling?: SerializedAutoscaling;
        healthCheck?: SerializedHealthcheck;
        private?: boolean;
        ingressAnnotations: Record<string, string>;
      }
    | {
        type: "worker";
        autoscaling?: SerializedAutoscaling;
      }
    | {
        type: "job";
        allowConcurrent?: boolean;
        cron: string;
        suspendCron?: boolean;
        timeoutSeconds: number;
      }
    | {
        type: "predeploy";
      };
};

export function isPredeployService(service: SerializedService | ClientService) {
  return service.config.type == "predeploy";
}

export function prefixSubdomain(subdomain: string) {
  if (subdomain.startsWith("https://") || subdomain.startsWith("http://")) {
    return subdomain;
  }
  return "https://" + subdomain;
}

export function uniqueServices(app: PorterApp): Service[] {
  const servicesFromMap = Object.entries(app.services ?? {}).map(
    ([name, service]) => {
      return new Service({
        ...service,
        name,
      });
    }
  );

  console.log("servicesFromMap", servicesFromMap);
  console.log("app.serviceList", app.serviceList)

  const uniqueServices = _.uniqBy(
    [...app.serviceList, ...servicesFromMap],
    (service) => service.name
  );

  return uniqueServices;
}

export function defaultSerialized({
  name,
  type,
  defaultCPU = 0.1,
  defaultRAM = 256,
}: {
  name: string;
  type: ClientServiceType;
  defaultCPU?: number;
  defaultRAM?: number;
}): SerializedService {
  const baseService = {
    name,
    run: "",
    instances: 1,
    port: 3000,
    cpuCores: defaultCPU,
    ramMegabytes: defaultRAM,
    smartOptimization: true,
  };

  const defaultAutoscaling: SerializedAutoscaling = {
    enabled: false,
    minInstances: 1,
    maxInstances: 10,
    cpuThresholdPercent: 50,
    memoryThresholdPercent: 50,
  };

  const defaultHealthCheck: SerializedHealthcheck = {
    enabled: false,
    httpPath: "/healthz",
  };

  return match(type)
    .with("web", () => ({
      ...baseService,
      config: {
        type: "web" as const,
        autoscaling: defaultAutoscaling,
        healthCheck: defaultHealthCheck,
        domains: [],
        private: false,
        ingressAnnotations: {},
      },
    }))
    .with("worker", () => ({
      ...baseService,
      config: {
        type: "worker" as const,
        autoscaling: defaultAutoscaling,
      },
    }))
    .with("job", () => ({
      ...baseService,
      config: {
        type: "job" as const,
        allowConcurrent: false,
        cron: "",
        suspendCron: false,
        timeoutSeconds: 3600,
      },
    }))
    .with("predeploy", () => ({
      ...baseService,
      config: {
        type: "predeploy" as const,
      },
    }))
    .exhaustive();
}

// serializeService converts a ClientService to a SerializedService
// A SerializedService holds just the values of a ClientService
// These values can be used to create a protobuf Service
export function serializeService(service: ClientService): SerializedService {
  return Object.freeze({
    name: service.name.value,
    run: service.run.value,
    instances: service.instances.value,
    port: service.port.value,
    cpuCores: service.cpuCores.value,
    ramMegabytes: Math.round(service.ramMegabytes.value), // RAM must be an integer
    smartOptimization: service.smartOptimization?.value,
    config: match(service.config)
      .with({ type: "web" }, (config) =>
        Object.freeze({
          type: "web" as const,
          autoscaling: serializeAutoscaling({
            autoscaling: config.autoscaling,
          }),
          healthCheck: serializeHealth({ health: config.healthCheck }),
          domains: config.domains.map((domain) => ({
            name: domain.name.value,
          })),
          ingressAnnotations: Object.fromEntries(
            config.ingressAnnotations
              .filter((a) => a.key.length > 0 && a.value.length > 0)
              .map((annotation) => [annotation.key, annotation.value])
          ),
          private: config.private?.value,
        })
      )
      .with({ type: "worker" }, (config) =>
        Object.freeze({
          type: "worker" as const,
          autoscaling: serializeAutoscaling({
            autoscaling: config.autoscaling,
          }),
        })
      )
      .with({ type: "job" }, (config) =>
        Object.freeze({
          type: "job" as const,
          allowConcurrent: config.allowConcurrent?.value,
          cron: config.cron.value,
          suspendCron: config.suspendCron?.value,
          timeoutSeconds: config.timeoutSeconds.value,
        })
      )
      .with({ type: "predeploy" }, () =>
        Object.freeze({
          type: "predeploy" as const,
        })
      )
      .exhaustive(),
  });
}

// deserializeService converts a SerializedService to a ClientService
// A deserialized ClientService represents the state of a service in the UI and which fields are editable
export function deserializeService({
  service,
  override,
  expanded,
  setDefaults = true,
}: {
  service: SerializedService;
  override?: SerializedService;
  expanded?: boolean;
  setDefaults?: boolean;
}): ClientService {
  const baseService = {
    expanded,
    canDelete: !override,
    name: ServiceField.string(service.name, override?.name),
    run: ServiceField.string(service.run, override?.run),
    instances: ServiceField.number(service.instances, override?.instances),
    port: ServiceField.number(service.port, override?.port),
    cpuCores: ServiceField.number(service.cpuCores, override?.cpuCores),
    ramMegabytes: ServiceField.number(
      service.ramMegabytes,
      override?.ramMegabytes
    ),
    smartOptimization: ServiceField.boolean(
      service.smartOptimization,
      override?.smartOptimization
    ),
    domainDeletions: [],
    ingressAnnotationDeletions: [],
  };

  return match(service.config)
    .with({ type: "web" }, (config) => {
      const overrideWebConfig =
        override?.config.type == "web" ? override.config : undefined;

      const uniqueDomains = Array.from(
        new Set([
          ...config.domains.map((domain) => domain.name),
          ...(overrideWebConfig?.domains ?? []).map((domain) => domain.name),
        ])
      ).map((domain) => ({ name: domain }));

      const uniqueAnnotations = _.uniqBy(
        [
          ...Object.entries(overrideWebConfig?.ingressAnnotations ?? {}).map(
            (annotation) => {
              return {
                key: annotation[0],
                value: annotation[1],
                readOnly: true,
              };
            }
          ),
          ...Object.entries(config.ingressAnnotations).map((annotation) => {
            return {
              key: annotation[0],
              value: annotation[1],
              readOnly: false,
            };
          }),
        ],
        "key"
      );

      return {
        ...baseService,
        config: {
          type: "web" as const,
          autoscaling: deserializeAutoscaling({
            autoscaling: config.autoscaling,
            override: overrideWebConfig?.autoscaling,
            setDefaults: setDefaults,
          }),
          healthCheck: deserializeHealthCheck({
            health: config.healthCheck,
            override: overrideWebConfig?.healthCheck,
            setDefaults: setDefaults,
          }),

          domains: uniqueDomains.map((domain) => ({
            name: ServiceField.string(
              domain.name,
              overrideWebConfig?.domains.find(
                (overrideDomain) => overrideDomain.name == domain.name
              )?.name
            ),
          })),
          ingressAnnotations: uniqueAnnotations,
          private:
            typeof config.private === "boolean" ||
            typeof overrideWebConfig?.private === "boolean"
              ? ServiceField.boolean(config.private, overrideWebConfig?.private)
              : setDefaults
              ? ServiceField.boolean(false, undefined)
              : undefined,
        },
      };
    })
    .with({ type: "worker" }, (config) => {
      const overrideWorkerConfig =
        override?.config.type == "worker" ? override.config : undefined;

      return {
        ...baseService,
        config: {
          type: "worker" as const,
          autoscaling: deserializeAutoscaling({
            autoscaling: config.autoscaling,
            override: overrideWorkerConfig?.autoscaling,
            setDefaults: setDefaults,
          }),
        },
      };
    })
    .with({ type: "job" }, (config) => {
      const overrideJobConfig =
        override?.config.type == "job" ? override.config : undefined;

      return {
        ...baseService,
        config: {
          type: "job" as const,
          allowConcurrent:
            typeof config.allowConcurrent === "boolean" ||
            typeof overrideJobConfig?.allowConcurrent === "boolean"
              ? ServiceField.boolean(
                  config.allowConcurrent,
                  overrideJobConfig?.allowConcurrent
                )
              : setDefaults
              ? ServiceField.boolean(false, undefined)
              : undefined,
          cron: ServiceField.string(config.cron, overrideJobConfig?.cron),
          suspendCron:
            typeof config.suspendCron === "boolean" ||
            typeof overrideJobConfig?.suspendCron === "boolean"
              ? ServiceField.boolean(
                  config.suspendCron,
                  overrideJobConfig?.suspendCron
                )
              : setDefaults
              ? ServiceField.boolean(false, undefined)
              : undefined,
          timeoutSeconds:
            config.timeoutSeconds != 0
              ? ServiceField.number(
                  config.timeoutSeconds,
                  overrideJobConfig?.timeoutSeconds
                )
              : setDefaults
              ? ServiceField.number(3600, overrideJobConfig?.timeoutSeconds)
              : ServiceField.number(0, overrideJobConfig?.timeoutSeconds),
        },
      };
    })
    .with({ type: "predeploy" }, () => ({
      ...baseService,
      config: {
        type: "predeploy" as const,
      },
    }))
    .exhaustive();
}

// getServiceTypeEnumProto converts the type of a ClientService to the protobuf ServiceType enum
export const serviceTypeEnumProto = (type: ClientServiceType): ServiceType => {
  return match(type)
    .with("web", () => ServiceType.WEB)
    .with("worker", () => ServiceType.WORKER)
    .with("job", () => ServiceType.JOB)
    .with("predeploy", () => ServiceType.JOB)
    .exhaustive();
};

// serviceProto converts a SerializedService to the protobuf Service
// This is used as an intermediate step to convert a ClientService to a protobuf Service
export function serviceProto(service: SerializedService): Service {
  return match(service.config)
    .with(
      { type: "web" },
      (config) =>
        new Service({
          ...service,
          runOptional: service.run,
          type: serviceTypeEnumProto(config.type),
          config: {
            value: {
              ...config,
            },
            case: "webConfig",
          },
        })
    )
    .with(
      { type: "worker" },
      (config) =>
        new Service({
          ...service,
          runOptional: service.run,
          type: serviceTypeEnumProto(config.type),
          config: {
            value: {
              ...config,
            },
            case: "workerConfig",
          },
        })
    )
    .with(
      { type: "job" },
      (config) =>
        new Service({
          ...service,
          runOptional: service.run,
          type: serviceTypeEnumProto(config.type),
          config: {
            value: {
              ...config,
              allowConcurrentOptional: config.allowConcurrent,
              timeoutSeconds: BigInt(config.timeoutSeconds),
            },
            case: "jobConfig",
          },
        })
    )
    .with(
      { type: "predeploy" },
      (config) =>
        new Service({
          ...service,
          runOptional: service.run,
          type: serviceTypeEnumProto(config.type),
          config: {
            value: {},
            case: "jobConfig",
          },
        })
    )
    .exhaustive();
}

// serializedServiceFromProto converts a protobuf Service to a SerializedService
// This is used as an intermediate step to convert a protobuf Service to a ClientService
export function serializedServiceFromProto({
  service,
  isPredeploy,
}: {
  service: Service;
  isPredeploy?: boolean;
}): SerializedService {
  const config = service.config;
  if (!config.case) {
    throw new Error("No case found on service config");
  }

  return match(config)
    .with({ case: "webConfig" }, ({ value }) => ({
      ...service,
      run: service.runOptional ?? service.run,
      config: {
        type: "web" as const,
        autoscaling: value.autoscaling ? value.autoscaling : undefined,
        healthCheck: value.healthCheck ? value.healthCheck : undefined,
        ...value,
      },
    }))
    .with({ case: "workerConfig" }, ({ value }) => ({
      ...service,
      run: service.runOptional ?? service.run,
      config: {
        type: "worker" as const,
        autoscaling: value.autoscaling ? value.autoscaling : undefined,
        ...value,
      },
    }))
    .with({ case: "jobConfig" }, ({ value }) =>
      isPredeploy
        ? {
            ...service,
            run: service.runOptional ?? service.run,
            config: {
              type: "predeploy" as const,
            },
          }
        : {
            ...service,
            run: service.runOptional ?? service.run,
            config: {
              type: "job" as const,
              ...value,
              allowConcurrent: value.allowConcurrentOptional,
              timeoutSeconds: Number(value.timeoutSeconds),
            },
          }
    )
    .exhaustive();
}
