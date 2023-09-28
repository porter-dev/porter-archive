import { match } from "ts-pattern";
import { z } from "zod";
import {
  SerializedAutoscaling,
  SerializedHealthcheck,
  autoscalingValidator,
  healthcheckValidator,
  deserializeAutoscaling,
  deserializeHealthCheck,
  serializeAutoscaling,
  serializeHealth,
  domainsValidator,
  serviceStringValidator,
  serviceNumberValidator,
  serviceBooleanValidator,
  ServiceField,
} from "./values";
import { Service, ServiceType } from "@porter-dev/api-contracts";
import { BuildOptions } from "./build";

export type DetectedServices = {
  services: ClientService[];
  predeploy?: ClientService;
  build?: BuildOptions;
};
type ClientServiceType = "web" | "worker" | "job" | "predeploy";

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
    z.object({
      type: z.literal("web"),
      autoscaling: autoscalingValidator.optional(),
      domains: domainsValidator,
      healthCheck: healthcheckValidator.optional(),
      private: serviceBooleanValidator.optional(),
    }),
    z.object({
      type: z.literal("worker"),
      autoscaling: autoscalingValidator.optional(),
    }),
    z.object({
      type: z.literal("job"),
      allowConcurrent: serviceBooleanValidator,
      cron: serviceStringValidator,
    }),
    z.object({
      type: z.literal("predeploy"),
    }),
  ]),
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
  }
  | {
    type: "worker";
    autoscaling?: SerializedAutoscaling;
  }
  | {
    type: "job";
    allowConcurrent: boolean;
    cron: string;
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

export function defaultSerialized({
  name,
  type,
}: {
  name: string;
  type: ClientServiceType;
}): SerializedService {
  const baseService = {
    name,
    run: "",
    instances: 1,
    port: 3000,
    cpuCores: 0.1,
    ramMegabytes: 256,
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
  return match(service.config)
    .with({ type: "web" }, (config) =>
      Object.freeze({
        name: service.name.value,
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
        smartOptimization: service.smartOptimization?.value,
        config: {
          type: "web" as const,
          autoscaling: serializeAutoscaling({
            autoscaling: config.autoscaling,
          }),
          healthCheck: serializeHealth({ health: config.healthCheck }),
          domains: config.domains.map((domain) => ({
            name: domain.name.value,
          })),
          private: config.private?.value,
        },
      })
    )
    .with({ type: "worker" }, (config) =>
      Object.freeze({
        name: service.name.value,
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
        smartOptimization: service.smartOptimization?.value,
        config: {
          type: "worker" as const,
          autoscaling: serializeAutoscaling({
            autoscaling: config.autoscaling,
          }),
        },
      })
    )
    .with({ type: "job" }, (config) =>
      Object.freeze({
        name: service.name.value,
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
        smartOptimization: service.smartOptimization?.value,
        config: {
          type: "job" as const,
          allowConcurrent: config.allowConcurrent.value,
          cron: config.cron.value,
        },
      })
    )
    .with({ type: "predeploy" }, () =>
      Object.freeze({
        name: service.name.value,
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        smartOptimization: service.smartOptimization?.value,
        ramMegabytes: service.ramMegabytes.value,
        config: {
          type: "predeploy" as const,
        },
      })
    )
    .exhaustive();
}

// deserializeService converts a SerializedService to a ClientService
// A deserialized ClientService represents the state of a service in the UI and which fields are editable
export function deserializeService({
  service,
  override,
  expanded,
}: {
  service: SerializedService;
  override?: SerializedService;
  expanded?: boolean;
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
    smartOptimization: ServiceField.boolean(service.smartOptimization, override?.smartOptimization),
  };

  return match(service.config)
    .with({ type: "web" }, (config) => {
      const overrideWebConfig =
        override?.config.type == "web" ? override.config : undefined;

      return {
        ...baseService,
        config: {
          type: "web" as const,
          autoscaling: deserializeAutoscaling({
            autoscaling: config.autoscaling,
            override: overrideWebConfig?.autoscaling,
          }),
          healthCheck: deserializeHealthCheck({
            health: config.healthCheck,
            override: overrideWebConfig?.healthCheck,
          }),

          domains: Array.from(
            new Set([...config.domains, ...(overrideWebConfig?.domains ?? [])])
          ).map((domain) => ({
            name: ServiceField.string(
              domain.name,
              overrideWebConfig?.domains.find(
                (overrideDomain) => overrideDomain.name == domain.name
              )?.name
            ),
          })),
          private:
            typeof config.private === "boolean" ||
              typeof overrideWebConfig?.private === "boolean"
              ? ServiceField.boolean(config.private, overrideWebConfig?.private)
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
          allowConcurrent: ServiceField.boolean(
            config.allowConcurrent,
            overrideJobConfig?.allowConcurrent
          ),
          cron: ServiceField.string(config.cron, overrideJobConfig?.cron),
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
          type: serviceTypeEnumProto(config.type),
          config: {
            value: {
              ...config,
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
  name,
  isPredeploy,
}: {
  service: Service;
  name: string;
  isPredeploy?: boolean;
}): SerializedService {
  const config = service.config;
  if (!config.case) {
    throw new Error("No case found on service config");
  }

  return match(config)
    .with({ case: "webConfig" }, ({ value }) => ({
      ...service,
      name,
      config: {
        type: "web" as const,
        autoscaling: value.autoscaling ? value.autoscaling : undefined,
        healthCheck: value.healthCheck ? value.healthCheck : undefined,
        ...value,
      },
    }))
    .with({ case: "workerConfig" }, ({ value }) => ({
      ...service,
      name,
      config: {
        type: "worker" as const,
        autoscaling: value.autoscaling ? value.autoscaling : undefined,
        ...value,
      },
    }))
    .with({ case: "jobConfig" }, ({ value }) => ({
      ...service,
      name,
      config: {
        type: isPredeploy ? ("predeploy" as const) : ("job" as const),
        ...value,
      },
    }))
    .exhaustive();
}
