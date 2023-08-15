import { z } from "zod";
import { ServiceField, serviceNumberValidator, serviceStringValidator } from "./services";

// Autoscaling
export const autoscalingValidator = z.object({
  minInstances: serviceNumberValidator,
  maxInstances: serviceNumberValidator,
  cpuThresholdPercent: serviceNumberValidator,
  memoryThresholdPercent: serviceNumberValidator,
});
export type ClientAutoscaling = z.infer<typeof autoscalingValidator>;
export type SerializedAutoscaling = {
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
  httpPath: serviceStringValidator,
});
export type ClientHealthCheck = z.infer<typeof healthcheckValidator>;
export type SerializedHealthcheck = {
  httpPath: string;
};

export function serializeHealth({
  health,
}: {
  health?: ClientHealthCheck;
}): SerializedHealthcheck | undefined {
  return (
    health && {
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
    httpPath: ServiceField.string(health.httpPath, override?.httpPath),
  };
}
