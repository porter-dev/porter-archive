import React, { useCallback, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { PorterAppFormData } from "lib/porter-apps";
import EnvGroupArrayV2 from "main/home/cluster-dashboard/env-groups/EnvGroupArrayV2";
import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArrayV2";

const EnvVariables: React.FC = () => {
  const { control } = useFormContext<PorterAppFormData>();

  const recordToKVType = useCallback((env?: Record<string, string>) => {
    console.log("env", env)
    return Object.entries(env ?? []).map(([key, value]) => {
      return { key, value, hidden: false, locked: false, deleted: false };
    });
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
        <EnvGroupArrayV2
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
