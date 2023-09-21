import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import { PorterAppFormData } from "lib/porter-apps";
import EnvGroupArrayV2 from "main/home/cluster-dashboard/env-groups/EnvGroupArrayV2";
import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArrayV2";

const EnvVariables: React.FC = () => {
  const { control } = useFormContext<PorterAppFormData>();

  return (
    <Controller
      name={`app.env`}
      control={control}
      render={({ field: { value, onChange } }) => (
        <>
          <EnvGroupArrayV2
            values={value ? value : []}
            setValues={(x: KeyValueType[]) => {
              onChange(x);
            }}
            fileUpload={true}
            syncedEnvGroups={[]}
          />
        </>
      )}
    />
  );
};

export default EnvVariables;
