import React, { useCallback } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { PorterAppFormData } from "lib/porter-apps";
import EnvGroupArrayStacks, {
  KeyValueType,
} from "main/home/cluster-dashboard/env-groups/EnvGroupArrayStacks";

const EnvVariables: React.FC = () => {
  const { control } = useFormContext<PorterAppFormData>();

  const recordToKVType = useCallback((env?: Record<string, string>) => {
    return env
      ? Object.entries(env).map(([key, value]) => {
          return { key, value, hidden: false, locked: false, deleted: false };
        })
      : [];
  }, []);

  const kvTypeToRecord = useCallback((env: KeyValueType[]) => {
    return env.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }, []);

  return (
    <Controller
      name={`app.env`}
      control={control}
      render={({ field: { value, onChange } }) => (
        <EnvGroupArrayStacks
          values={recordToKVType(value)}
          setValues={(x: KeyValueType[]) => {
            onChange(kvTypeToRecord(x));
          }}
          fileUpload={true}
          syncedEnvGroups={[]}
        />
      )}
    />
  );
};

export default EnvVariables;
