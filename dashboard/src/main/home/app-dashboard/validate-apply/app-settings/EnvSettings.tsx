import React, { useContext, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import {
  PorterAppFormData,
  SourceOptions,
  clientAppFromProto,
} from "lib/porter-apps";
import { z } from "zod";

import { PopulatedEnvGroup, populatedEnvGroup } from "./types";
import EnvVariables from "./EnvVariables";
import EnvGroups from "./EnvGroups";
import { Context } from "shared/Context";
import { useQuery } from "@tanstack/react-query";
import api from "shared/api";
import { AppRevision } from "lib/revisions/types";
import { PorterApp } from "@porter-dev/api-contracts";
import { DetectedServices } from "lib/porter-apps/services";

type Props = {
  appName?: string;
  revision?: AppRevision;
  baseEnvGroups?: PopulatedEnvGroup[];
  existingEnvGroupNames?: string[];
  servicesFromYaml: DetectedServices | null;
  latestSource?: SourceOptions;
};

const EnvSettings: React.FC<Props> = (props) => {
  const { currentCluster, currentProject } = useContext(Context);
  const { reset } = useFormContext<PorterAppFormData>();

  const { appName, revision, latestSource, servicesFromYaml } = props;

  const { data: { attachedEnvGroups = [], appEnv } = {} } = useQuery(
    ["getAttachedEnvGroups", appName, revision?.id],
    async () => {
      if (!appName || !revision || !currentCluster?.id || !currentProject?.id) {
        return {
          attachedEnvGroups: [],
          appEnv: undefined,
        };
      }

      const res = await api.getAttachedEnvGroups(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          app_name: appName,
          revision_id: revision.id,
        }
      );

      const { env_groups: attachedEnvGroups, app_env: appEnv } = await z
        .object({
          env_groups: z.array(populatedEnvGroup),
          app_env: populatedEnvGroup,
        })
        .parseAsync(res.data);

      return {
        attachedEnvGroups,
        appEnv,
      };
    },
    {
      enabled: !!appName && !!revision && !!currentCluster && !!currentProject,
    }
  );

  useEffect(() => {
    if (!appEnv || !revision || !latestSource) {
      return;
    }
    reset({
      app: clientAppFromProto({
        proto: PorterApp.fromJsonString(atob(revision.b64_app_proto)),
        overrides: servicesFromYaml,
        variables: appEnv.variables,
        secrets: appEnv.secret_variables,
      }),
      source: latestSource,
      deletions: {
        serviceNames: [],
        envGroupNames: [],
      },
    });
  }, [appEnv, revision?.id, latestSource]);

  return (
    <>
      <EnvVariables />
      <EnvGroups {...props} attachedEnvGroups={attachedEnvGroups} />
    </>
  );
};

export default EnvSettings;
