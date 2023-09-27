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

type Props = {
  latestSource: SourceOptions;
};

const Environment: React.FC<Props> = ({ latestSource }) => {
  const {
    latestRevision,
    latestProto,
    clusterId,
    projectId,
    previewRevision,
    servicesFromYaml,
    attachedEnvGroups,
  } = useLatestRevision();
  const {
    formState: { isSubmitting, errors },
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

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }

    if (Object.keys(errors).length > 0) {
      return <Error message="Unable to update app" />;
    }

    return "";
  }, [isSubmitting, errors]);

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
        servicesFromYaml={servicesFromYaml}
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
      >
        Update app
      </Button>
    </>
  );
};

export default Environment;
