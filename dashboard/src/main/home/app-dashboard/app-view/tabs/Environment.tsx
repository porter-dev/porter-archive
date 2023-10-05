import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React, { useMemo } from "react";
import Button from "components/porter/Button";
import Error from "components/porter/Error";
import { useFormContext } from "react-hook-form";
import { PorterAppFormData, SourceOptions } from "lib/porter-apps";
import { useLatestRevision } from "../LatestRevisionContext";
import { useQuery } from "@tanstack/react-query";
import api from "shared/api";
import { z } from "zod";
import { populatedEnvGroup } from "../../validate-apply/app-settings/types";
import EnvSettings from "../../validate-apply/app-settings/EnvSettings";
import { ButtonStatus } from "../AppDataContainer";

type Props = {
  latestSource: SourceOptions;
  buttonStatus: ButtonStatus;
};

const Environment: React.FC<Props> = ({ latestSource, buttonStatus }) => {
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

      const { environment_groups } = await z
        .object({
          environment_groups: z.array(populatedEnvGroup).default([]),
        })
        .parseAsync(res.data);

      return environment_groups;
    }
  );

  return (
    <>
      <Text size={16}>Environment variables</Text>
      <Spacer y={0.5} />
      <Text color="helper">Shared among all services.</Text>
      <EnvSettings
        appName={latestProto.name}
        revision={previewRevision ? previewRevision : latestRevision} // get versions of env groups attached to preview revision if set
        baseEnvGroups={baseEnvGroups}
        latestSource={latestSource}
        attachedEnvGroups={attachedEnvGroups}
      />
      <Spacer y={0.5} />
      <Button
        type="submit"
        status={buttonStatus}
        loadingText={"Updating..."}
        disabled={
          isSubmitting ||
          latestRevision.status === "CREATED" ||
          latestRevision.status === "AWAITING_BUILD_ARTIFACT"
        }
        disabledTooltipMessage="Please wait for the deploy to complete before updating environment variables"
      >
        Update app
      </Button>
    </>
  );
};

export default Environment;
