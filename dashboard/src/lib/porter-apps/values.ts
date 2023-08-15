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
  existing,
}: {
  autoscaling?: SerializedAutoscaling;
  existing?: SerializedAutoscaling;
}): ClientAutoscaling | undefined {
  if (!autoscaling) {
    return undefined;
  }

  return {
    minInstances: ServiceField.number(
      autoscaling.minInstances,
      existing?.minInstances
    ),
    maxInstances: ServiceField.number(
      autoscaling.maxInstances,
      existing?.maxInstances
    ),
    cpuThresholdPercent: ServiceField.number(
      autoscaling.cpuThresholdPercent,
      existing?.cpuThresholdPercent
    ),
    memoryThresholdPercent: ServiceField.number(
      autoscaling.memoryThresholdPercent,
      existing?.memoryThresholdPercent
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
  existing,
}: {
  health?: SerializedHealthcheck;
  existing?: SerializedHealthcheck;
}) {
  if (!health) {
    return undefined;
  }

  return {
    httpPath: ServiceField.string(health.httpPath, existing?.httpPath),
  };
}
