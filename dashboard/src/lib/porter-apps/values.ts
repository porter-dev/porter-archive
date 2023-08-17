import { z } from "zod";
import {
  ServiceField,
  serviceBooleanValidator,
  serviceNumberValidator,
  serviceStringValidator,
} from "./services";

// Autoscaling
export const autoscalingValidator = z.object({
  enabled: serviceBooleanValidator,
  minInstances: serviceNumberValidator.optional(),
  maxInstances: serviceNumberValidator.optional(),
  cpuThresholdPercent: serviceNumberValidator.optional(),
  memoryThresholdPercent: serviceNumberValidator.optional(),
});
export type ClientAutoscaling = z.infer<typeof autoscalingValidator>;
export type SerializedAutoscaling = {
  enabled: boolean;
  minInstances?: number;
  maxInstances?: number;
  cpuThresholdPercent?: number;
  memoryThresholdPercent?: number;
};

export function serializeAutoscaling({
  autoscaling,
}: {
  autoscaling: ClientAutoscaling;
}): SerializedAutoscaling {
  return {
    enabled: autoscaling.enabled.value,
    minInstances: autoscaling.minInstances?.value,
    maxInstances: autoscaling.maxInstances?.value,
    cpuThresholdPercent: autoscaling.cpuThresholdPercent?.value,
    memoryThresholdPercent: autoscaling.memoryThresholdPercent?.value,
  };
}

export function deserializeAutoscaling({
  autoscaling,
  override,
}: {
  autoscaling: SerializedAutoscaling;
  override?: SerializedAutoscaling;
}): ClientAutoscaling {
  return {
    enabled: ServiceField.boolean(autoscaling.enabled, override?.enabled),
    minInstances: autoscaling.minInstances
      ? ServiceField.number(autoscaling.minInstances, override?.minInstances)
      : undefined,
    maxInstances: autoscaling.maxInstances
      ? ServiceField.number(autoscaling.maxInstances, override?.maxInstances)
      : undefined,
    cpuThresholdPercent: autoscaling.cpuThresholdPercent
      ? ServiceField.number(
          autoscaling.cpuThresholdPercent,
          override?.cpuThresholdPercent
        )
      : undefined,
    memoryThresholdPercent: autoscaling.memoryThresholdPercent
      ? ServiceField.number(
          autoscaling.memoryThresholdPercent,
          override?.memoryThresholdPercent
        )
      : undefined,
  };
}

// Health Check
export const healthcheckValidator = z.object({
  enabled: serviceBooleanValidator,
  httpPath: serviceStringValidator.optional(),
});
export type ClientHealthCheck = z.infer<typeof healthcheckValidator>;
export type SerializedHealthcheck = {
  enabled: boolean;
  httpPath?: string;
};

export function serializeHealth({
  health,
}: {
  health: ClientHealthCheck;
}): SerializedHealthcheck {
  return {
    enabled: health.enabled.value,
    httpPath: health.httpPath?.value,
  };
}
export function deserializeHealthCheck({
  health,
  override,
}: {
  health: SerializedHealthcheck;
  override?: SerializedHealthcheck;
}) {
  return {
    enabled: ServiceField.boolean(health.enabled, override?.enabled),
    httpPath: health.httpPath
      ? ServiceField.string(health.httpPath, override?.httpPath)
      : undefined,
  };
}

// Domains
export const domainsValidator = z.array(
  z.object({
    name: serviceStringValidator,
  })
);
export type ClientDomains = z.infer<typeof domainsValidator>;