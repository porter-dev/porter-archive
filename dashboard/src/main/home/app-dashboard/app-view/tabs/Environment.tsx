import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import { z } from "zod";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import PreviewSaveButton from "main/home/cluster-dashboard/preview-environments/v2/setup-app/PreviewSaveButton";
import { type PorterAppFormData } from "lib/porter-apps";

import api from "shared/api";

import EnvSettings from "../../validate-apply/app-settings/EnvSettings";
import { populatedEnvGroup } from "../../validate-apply/app-settings/types";
import { type ButtonStatus } from "../AppDataContainer";
import { useLatestRevision } from "../LatestRevisionContext";

type Props = {
  buttonStatus: ButtonStatus;
};

const Environment: React.FC<Props> = ({ buttonStatus }) => {
  const {
    latestRevision,
    latestProto,
    clusterId,
    projectId,
    previewRevision,
    attachedEnvGroups,
  } = useLatestRevision();
  const {
    formState: { isSubmitting },
  } = useFormContext<PorterAppFormData>();

  const { data: baseEnvGroups = [] } = useQuery(
    ["getAllEnvGroups", projectId, clusterId],
    async () => {
      const res = await api.getAllEnvGroups(
        "<token>",
        {},
        {
          id: projectId,
          cluster_id: clusterId,
        }
      );

      const { environment_groups: envGroups } = await z
        .object({
          environment_groups: z.array(populatedEnvGroup).default([]),
        })
        .parseAsync(res.data);

      return envGroups;
    }
  );

  return (
    <>
      <Text size={16}>Environment variables</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Shared among all services. All non-secret variables are also available
        at build time.
      </Text>
      <EnvSettings
        appName={latestProto.name}
        revision={previewRevision || latestRevision} // get versions of env groups attached to preview revision if set
        baseEnvGroups={baseEnvGroups}
        attachedEnvGroups={attachedEnvGroups}
      />
      <Spacer y={1} />
      <PreviewSaveButton
        status={buttonStatus}
        isDisabled={isSubmitting}
        disabledTooltipMessage="Please wait for the deploy to complete before updating environment variables"
      />
    </>
  );
};

export default Environment;
