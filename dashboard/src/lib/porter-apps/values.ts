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
  minInstances: serviceNumberValidator,
  maxInstances: serviceNumberValidator,
  cpuThresholdPercent: serviceNumberValidator,
  memoryThresholdPercent: serviceNumberValidator,
});
export type ClientAutoscaling = z.infer<typeof autoscalingValidator>;
export type SerializedAutoscaling = {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  cpuThresholdPercent: number;
  memoryThresholdPercent: number;
};

export function serializeAutoscaling({
  autoscaling,
}: {
  autoscaling?: ClientAutoscaling;
}): SerializedAutoscaling | undefined {
  return (
    autoscaling && {
      enabled: autoscaling.enabled.value,
      minInstances: autoscaling.minInstances.value,
      maxInstances: autoscaling.maxInstances.value,
      cpuThresholdPercent: autoscaling.cpuThresholdPercent.value,
      memoryThresholdPercent: autoscaling.memoryThresholdPercent.value,
    }
  );
}

export function deserializeAutoscaling({
  autoscaling,
  override,
}: {
  autoscaling?: SerializedAutoscaling;
  override?: SerializedAutoscaling;
}): ClientAutoscaling | undefined {
  if (!autoscaling) {
    return undefined;
  }

  return {
    enabled: ServiceField.boolean(autoscaling.enabled, override?.enabled),
    minInstances: ServiceField.number(
      autoscaling.minInstances,
      override?.minInstances
    ),
    maxInstances: ServiceField.number(
      autoscaling.maxInstances,
      override?.maxInstances
    ),
    cpuThresholdPercent: ServiceField.number(
      autoscaling.cpuThresholdPercent,
      override?.cpuThresholdPercent
    ),
    memoryThresholdPercent: ServiceField.number(
      autoscaling.memoryThresholdPercent,
      override?.memoryThresholdPercent
    ),
  };
}

// Health Check
export const healthcheckValidator = z.object({
  enabled: serviceBooleanValidator,
  httpPath: serviceStringValidator,
});
export type ClientHealthCheck = z.infer<typeof healthcheckValidator>;
export type SerializedHealthcheck = {
  enabled: boolean;
  httpPath: string;
};

export function serializeHealth({
  health,
}: {
  health?: ClientHealthCheck;
}): SerializedHealthcheck | undefined {
  return (
    health && {
      enabled: health.enabled.value,
      httpPath: health.httpPath.value,
    }
  );
}
export function deserializeHealthCheck({
  health,
  override,
}: {
  health?: SerializedHealthcheck;
  override?: SerializedHealthcheck;
}) {
  if (!health) {
    return undefined;
  }

  return {
    enabled: ServiceField.boolean(health.enabled, override?.enabled),
    httpPath: ServiceField.string(health.httpPath, override?.httpPath),
  };
}
