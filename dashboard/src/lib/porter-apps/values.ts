import { z } from "zod";

// ServiceString is a string value in a service that can be read-only or editable
export const serviceStringValidator = z.object({
  readOnly: z.boolean(),
  value: z.string(),
});
export type ServiceString = z.infer<typeof serviceStringValidator>;

// ServiceNumber is a number value in a service that can be read-only or editable
export const serviceNumberValidator = z.object({
  readOnly: z.boolean(),
  value: z.coerce.number(),
});
export type ServiceNumber = z.infer<typeof serviceNumberValidator>;

// ServiceBoolean is a boolean value in a service that can be read-only or editable
export const serviceBooleanValidator = z.object({
  readOnly: z.boolean(),
  value: z.boolean(),
});
export type ServiceBoolean = z.infer<typeof serviceBooleanValidator>;

// ServiceArray is an array of ServiceStrings
const serviceArrayValidator = z.array(
  z.object({
    key: z.string(),
    value: serviceStringValidator,
  })
);
export type ServiceArray = z.infer<typeof serviceArrayValidator>;

const getNumericValue = (
  defaultValue: number,
  overrideValue?: number,
  validAsZero = false
) => {
  if (!overrideValue) {
    return defaultValue;
  }

  if (!validAsZero && overrideValue === 0) {
    return defaultValue;
  }

  return overrideValue;
};

// ServiceField is a helper to create a ServiceString, ServiceNumber, or ServiceBoolean
export const ServiceField = {
  string: (defaultValue: string, overrideValue?: string): ServiceString => {
    return {
      readOnly: !!overrideValue,
      value: overrideValue ?? defaultValue,
    };
  },
  number: (
    defaultValue: number,
    overrideValue?: number,
    validAsZero = false
  ): ServiceNumber => {
    return {
      readOnly: !!overrideValue || (validAsZero && overrideValue === 0),
      value: getNumericValue(defaultValue, overrideValue, validAsZero),
    };
  },
  boolean: (
    defaultValue?: boolean,
    overrideValue?: boolean
  ): ServiceBoolean => {
    return {
      readOnly: typeof overrideValue === "boolean",
      value: overrideValue ?? defaultValue ?? false,
    };
  },
};

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
  autoscaling?: ClientAutoscaling;
}): SerializedAutoscaling | undefined {
  return (
    autoscaling && {
      enabled: autoscaling.enabled.value,
      minInstances: autoscaling.minInstances?.value,
      maxInstances: autoscaling.maxInstances?.value,
      cpuThresholdPercent: autoscaling.cpuThresholdPercent?.value,
      memoryThresholdPercent: autoscaling.memoryThresholdPercent?.value,
    }
  );
}

export function deserializeAutoscaling({
  autoscaling,
  override,
  allowUndefined,
}: {
  autoscaling?: SerializedAutoscaling;
  override?: SerializedAutoscaling;
    allowUndefined: boolean;
}): ClientAutoscaling | undefined {
  return (
    autoscaling ? {
      enabled: ServiceField.boolean(autoscaling.enabled, override?.enabled),
      minInstances: autoscaling.minInstances
        ? ServiceField.number(autoscaling.minInstances, override?.minInstances)
        : ServiceField.number(1, undefined),
      maxInstances: autoscaling.maxInstances
        ? ServiceField.number(autoscaling.maxInstances, override?.maxInstances)
        : ServiceField.number(10, undefined),
      cpuThresholdPercent: autoscaling.cpuThresholdPercent
        ? ServiceField.number(
            autoscaling.cpuThresholdPercent,
            override?.cpuThresholdPercent
          )
        : ServiceField.number(50, undefined),
      memoryThresholdPercent: autoscaling.memoryThresholdPercent
        ? ServiceField.number(
            autoscaling.memoryThresholdPercent,
            override?.memoryThresholdPercent
          )
        : ServiceField.number(50, undefined),
    } : (allowUndefined ? undefined : {
        enabled: ServiceField.boolean(false, undefined),
        minInstances: ServiceField.number(1, undefined),
        maxInstances: ServiceField.number(10, undefined),
        cpuThresholdPercent: ServiceField.number(50, undefined),
        memoryThresholdPercent: ServiceField.number(50, undefined),
    })
  );
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
  health?: ClientHealthCheck;
}): SerializedHealthcheck | undefined {
  return (
    health && {
      enabled: health.enabled.value,
      httpPath: health.httpPath?.value,
    }
  );
}
export function deserializeHealthCheck({
  health,
  override,
  allowUndefined,
}: {
  health?: SerializedHealthcheck;
  override?: SerializedHealthcheck;
  allowUndefined: boolean;
}): ClientHealthCheck | undefined {
  return (
    health ? {
      enabled: ServiceField.boolean(health.enabled, override?.enabled),
      httpPath: health.httpPath
        ? ServiceField.string(health.httpPath, override?.httpPath)
        :  ServiceField.string("", undefined),
    } : (allowUndefined ? undefined : {
        enabled: ServiceField.boolean(false, undefined),
        httpPath: ServiceField.string("", undefined),
    })
  );
}

// Domains
export const domainsValidator = z.array(
  z.object({
    name: serviceStringValidator,
  })
);
export type ClientDomains = z.infer<typeof domainsValidator>;
