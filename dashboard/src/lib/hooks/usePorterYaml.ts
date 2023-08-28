import { PorterApp } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { SourceOptions, serviceOverrides } from "lib/porter-apps";
import { ClientService, DetectedServices } from "lib/porter-apps/services";
import { useCallback, useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { z } from "zod";

type PorterYamlStatus =
  | {
      loading: true;
      detectedServices: null;
    }
  | {
      detectedServices: DetectedServices | null;
      loading: false;
    };

/*
 *
 * usePorterYaml is a hook that will fetch the porter.yaml file from the
 * specified source and parse it to determine the services that should be
 * added to an app by default with read-only values.
 *
 */
export const usePorterYaml = ({
  source,
  useDefaults = true,
}: {
  source: SourceOptions | null;
  useDefaults?: boolean;
}): PorterYamlStatus => {
  const { currentProject, currentCluster } = useContext(Context);
  const [
    detectedServices,
    setDetectedServices,
  ] = useState<DetectedServices | null>(null);

  const { data, status } = useQuery(
    [
      "getPorterYamlContents",
      currentProject?.id,
      source?.git_branch,
      source?.git_repo_name,
    ],
    async () => {
      if (!currentProject) {
        return;
      }
      if (source?.type !== "github") {
        return;
      }
      const res = await api.getPorterYamlContents(
        "<token>",
        {
          path: source.porter_yaml_path,
        },
        {
          project_id: currentProject.id,
          git_repo_id: source.git_repo_id,
          kind: "github",
          owner: source.git_repo_name.split("/")[0],
          name: source.git_repo_name.split("/")[1],
          branch: source.git_branch,
        }
      );

      return z.string().parseAsync(res.data);
    },
    {
      enabled:
        source?.type === "github" &&
        Boolean(source.git_repo_name) &&
        Boolean(source.git_branch),
    }
  );

  const detectServices = useCallback(
    async ({
      b64Yaml,
      projectId,
      clusterId,
    }: {
      b64Yaml: string;
      projectId: number;
      clusterId: number;
    }) => {
      try {
        const res = await api.parsePorterYaml(
          "<token>",
          { b64_yaml: b64Yaml },
          {
            project_id: projectId,
            cluster_id: clusterId,
          }
        );

        const data = await z
          .object({
            b64_app_proto: z.string(),
          })
          .parseAsync(res.data);
        const proto = PorterApp.fromJsonString(atob(data.b64_app_proto));

        const { services, predeploy } = serviceOverrides({
          overrides: proto,
          useDefaults,
        });

        if (services.length || predeploy) {
          setDetectedServices({
            services,
            predeploy,
          });
        }
      } catch (err) {
        // silent failure for now
      }
    },
    []
  );

  useEffect(() => {
    if (!currentProject || !currentCluster) {
      return;
    }

    if (data) {
      detectServices({
        b64Yaml: data,
        projectId: currentProject.id,
        clusterId: currentCluster.id,
      });
    }

    if (!data && detectedServices) {
      setDetectedServices(null);
    }
  }, [data]);

  if (status === "loading") {
    return {
      loading: true,
      detectedServices: null,
    };
  }

  return {
    detectedServices,
    loading: false,
  };
};
