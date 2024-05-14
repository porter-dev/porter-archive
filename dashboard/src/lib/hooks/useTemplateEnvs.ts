import { useContext, useMemo } from "react";
import { Addon, PorterApp } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { clientAddonFromProto } from "lib/addons";
import { type Environment } from "lib/environments/types";
import { clientAppFromProto } from "lib/porter-apps";

import api from "shared/api";
import { Context } from "shared/Context";

type TUseTemplateEnvs = {
  environments: Environment[];
  status: "error" | "success" | "loading";
};

const listTemplateEnvsResValidator = z.object({
  name: z.string(),
  base64_apps: z.string().array().default([]),
  base64_addons: z.string().array().default([]),
});

export const useTemplateEnvs = (): TUseTemplateEnvs => {
  const { currentProject, currentCluster } = useContext(Context);

  const { data: encodedEnvironments = [], status } = useQuery(
    ["listTemplateEnvironments", currentProject?.id, currentCluster?.id],
    async () => {
      if (!currentProject || !currentCluster) {
        return [];
      }

      const res = await api.listTemplateEnvironments(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );

      const data = await z
        .object({
          environment_templates: z
            .array(listTemplateEnvsResValidator)
            .default([]),
        })
        .parseAsync(res.data);
      return data.environment_templates;
    },
    {
      enabled: !!currentProject && !!currentCluster,
    }
  );

  const environments = useMemo(() => {
    return encodedEnvironments.map((env) => {
      const apps = env.base64_apps.map((a) =>
        clientAppFromProto({
          proto: PorterApp.fromJsonString(atob(a), {
            ignoreUnknownFields: true,
          }),
          overrides: null,
        })
      );
      const addons = env.base64_addons.map((a) =>
        clientAddonFromProto({
          addon: Addon.fromJsonString(atob(a), {
            ignoreUnknownFields: true,
          }),
        })
      );

      return {
        name: env.name,
        apps,
        addons,
      };
    });
  }, [encodedEnvironments]);

  return {
    environments,
    status,
  };
};
