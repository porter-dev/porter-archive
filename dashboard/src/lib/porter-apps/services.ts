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
} from "./values";
import { Service, ServiceType } from "@porter-dev/api-contracts";

export const serviceStringValidator = z.object({
  readOnly: z.boolean(),
  value: z.string(),
});
export type ServiceString = z.infer<typeof serviceStringValidator>;

export const serviceNumberValidator = z.object({
  readOnly: z.boolean(),
  value: z.number(),
});
export type ServiceNumber = z.infer<typeof serviceNumberValidator>;

export const serviceBooleanValidator = z.object({
  readOnly: z.boolean(),
  value: z.boolean(),
});
export type ServiceBoolean = z.infer<typeof serviceBooleanValidator>;

const serviceArrayValidator = z.array(
  z.object({
    key: z.string(),
    value: serviceStringValidator,
  })
);
export type ServiceArray = z.infer<typeof serviceArrayValidator>;

export const ServiceField = {
  string: (defaultValue: string, overrideValue?: string): ServiceString => {
    return {
      readOnly: !!overrideValue,
      value: overrideValue ?? defaultValue,
    };
  },
  number: (defaultValue: number, overrideValue?: number): ServiceNumber => {
    return {
      readOnly: !!overrideValue,
      value: overrideValue ?? defaultValue,
    };
  },
  boolean: (defaultValue: boolean, overrideValue?: boolean): ServiceBoolean => {
    return {
      readOnly: !!overrideValue,
      value: overrideValue ?? defaultValue,
    };
  },
};

export const serviceValidator = z.object({
  run: serviceStringValidator,
  instances: serviceNumberValidator,
  port: serviceNumberValidator,
  cpuCores: serviceNumberValidator,
  ramMegabytes: serviceNumberValidator,
  config: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("web"),
      autoscaling: autoscalingValidator.optional(),
      domains: z.array(
        z.object({
          name: serviceStringValidator,
        })
      ),
      healthCheck: healthcheckValidator.optional(),
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
  ]),
});

export type ClientService = z.infer<typeof serviceValidator>;

export type SerializedService = {
  run: string;
  instances: number;
  port: number;
  cpuCores: number;
  ramMegabytes: number;
  config:
    | {
        type: "web";
        domains: {
          name: string;
        }[];
        autoscaling?: SerializedAutoscaling;
        healthCheck?: SerializedHealthcheck;
      }
    | {
        type: "worker";
        autoscaling?: SerializedAutoscaling;
      }
    | {
        type: "job";
        allowConcurrent: boolean;
        cron: string;
      };
};

export function serializeService(service: ClientService): SerializedService {
  return match(service.config)
    .with({ type: "web" }, (config) =>
      Object.freeze({
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
        config: {
          type: "web" as const,
          autoscaling: serializeAutoscaling({
            autoscaling: config.autoscaling,
          }),
          healthCheck: serializeHealth({ health: config.healthCheck }),
          domains: config.domains.map((domain) => ({
            name: domain.name.value,
          })),
        },
      })
    )
    .with({ type: "worker" }, (config) =>
      Object.freeze({
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
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
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
        config: {
          type: "job" as const,
          allowConcurrent: config.allowConcurrent.value,
          cron: config.cron.value,
        },
      })
    )
    .exhaustive();
}

export function deserializeService(
  service: SerializedService,
  existing?: SerializedService
): ClientService {
  const baseService = {
    run: ServiceField.string(service.run, existing?.run),
    instances: ServiceField.number(service.instances, existing?.instances),
    port: ServiceField.number(service.port, existing?.port),
    cpuCores: ServiceField.number(service.cpuCores, existing?.cpuCores),
    ramMegabytes: ServiceField.number(
      service.ramMegabytes,
      existing?.ramMegabytes
    ),
  };

  return match(service.config)
    .with({ type: "web" }, (config) => {
      const existingWebConfig =
        existing?.config.type == "web" ? existing.config : undefined;

      return {
        ...baseService,
        config: {
          type: "web" as const,
          autoscaling: deserializeAutoscaling({
            autoscaling: config.autoscaling,
            existing: existingWebConfig?.autoscaling,
          }),
          healthCheck: deserializeHealthCheck({
            health: config.healthCheck,
            existing: existingWebConfig?.healthCheck,
          }),
          domains: config.domains.map((domain) => ({
            name: ServiceField.string(
              domain.name,
              existingWebConfig?.domains.find(
                (existingDomain) => existingDomain.name == domain.name
              )?.name
            ),
          })),
        },
      };
    })
    .with({ type: "worker" }, (config) => {
      const existingWorkerConfig =
        existing?.config.type == "worker" ? existing.config : undefined;

      return {
        ...baseService,
        config: {
          type: "worker" as const,
          autoscaling: deserializeAutoscaling({
            autoscaling: config.autoscaling,
            existing: existingWorkerConfig?.autoscaling,
          }),
        },
      };
    })
    .with({ type: "job" }, (config) => {
      const existingJobConfig =
        existing?.config.type == "job" ? existing.config : undefined;

      return {
        ...baseService,
        config: {
          type: "job" as const,
          allowConcurrent: ServiceField.boolean(
            config.allowConcurrent,
            existingJobConfig?.allowConcurrent
          ),
          cron: ServiceField.string(config.cron, existingJobConfig?.cron),
        },
      };
    })
    .exhaustive();
}

export const getServiceTypeEnumProto = (type: "web" | "worker" | "job") => {
  return match(type)
    .with("web", () => ServiceType.WEB)
    .with("worker", () => ServiceType.WORKER)
    .with("job", () => ServiceType.JOB)
    .exhaustive();
};

export function getServiceProto(service: SerializedService) {
  return match(service.config)
    .with(
      { type: "web" },
      (config) =>
        new Service({
          ...service,
          type: getServiceTypeEnumProto(config.type),
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
          type: getServiceTypeEnumProto(config.type),
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
          type: getServiceTypeEnumProto(config.type),
          config: {
            value: {
              ...config,
            },
            case: "jobConfig",
          },
        })
    )
    .exhaustive();
}

export function getSerializedServiceFromProto(
  service: Service
): SerializedService {
  const config = service.config;
  if (!config.case) {
    throw new Error("No case found on service config");
  }

  return match(config)
    .with({ case: "webConfig" }, ({ value }) => ({
      ...service,
      config: {
        type: "web" as const,
        ...value,
      },
    }))
    .with({ case: "workerConfig" }, ({ value }) => ({
      ...service,
      config: {
        type: "worker" as const,
        ...value,
      },
    }))
    .with({ case: "jobConfig" }, ({ value }) => ({
      ...service,
      config: {
        type: "job" as const,
        ...value,
      },
    }))
    .exhaustive();
}
