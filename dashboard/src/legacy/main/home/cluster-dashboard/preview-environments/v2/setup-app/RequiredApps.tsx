import React, { useContext, useMemo } from "react";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { useLatestAppRevisions } from "legacy/lib/hooks/useLatestAppRevisions";
import { type PorterAppFormData } from "legacy/lib/porter-apps";
import { useFieldArray, useFormContext } from "react-hook-form";

import { type ButtonStatus } from "main/home/app-dashboard/app-view/AppDataContainer";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import SelectableAppList from "main/home/app-dashboard/apps/SelectableAppList";

import { Context } from "shared/Context";

import PreviewSaveButton from "./PreviewSaveButton";

type Props = {
  buttonStatus: ButtonStatus;
};

export const RequiredApps: React.FC<Props> = ({ buttonStatus }) => {
  const { currentCluster, currentProject } = useContext(Context);

  const {
    control,
    formState: { isSubmitting },
  } = useFormContext<PorterAppFormData>();
  const { append, remove, fields } = useFieldArray({
    control,
    name: "app.requiredApps",
  });

  const { porterApp } = useLatestRevision();

  const { revisions: apps } = useLatestAppRevisions({
    projectId: currentProject?.id ?? 0,
    clusterId: currentCluster?.id ?? 0,
  });

  const remainingApps = useMemo(() => {
    return apps.filter((a) => a.source.name !== porterApp.name);
  }, [apps, porterApp, fields.length]);

  return (
    <div>
      <Text size={16}>Required Apps</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Apps from other repositories that should be deployed alongside previews
        of {porterApp.name}. Any selected app will be a copy of the main app
        running on the cluster.
      </Text>
      <Spacer y={0.5} />
      <SelectableAppList
        appListItems={remainingApps.map((ra) => {
          const selectedAppIdx = fields.findIndex(
            (f) => f.name === ra.source.name
          );

          return {
            app: ra,
            key:
              selectedAppIdx !== -1
                ? fields[selectedAppIdx].id
                : ra.source.name,
            onSelect: () => {
              append({ name: ra.source.name });
            },
            onDeselect: () => {
              remove(selectedAppIdx);
            },
            isSelected: selectedAppIdx !== -1,
          };
        })}
      />
      <Spacer y={0.75} />
      <PreviewSaveButton
        status={buttonStatus}
        isDisabled={isSubmitting}
        disabledTooltipMessage={"Please fill out all required fields"}
        disabledTooltipPosition={"top"}
      />
    </div>
  );
};
