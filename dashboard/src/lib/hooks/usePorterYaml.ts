import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useClusterContext } from "main/home/infrastructure-dashboard/ClusterContextProvider";
import { serviceOverrides, type SourceOptions } from "lib/porter-apps";
import {
  getServiceResourceAllowances,
  type DetectedServices,
} from "lib/porter-apps/services";

import api from "shared/api";
import { Context } from "shared/Context";

type PorterYamlStatus =
  | {
      loading: true;
      detectedName: null;
      detectedServices: null;
      porterYamlFound: false;
    }
  | {
      detectedServices: DetectedServices | null;
      detectedName: string | null;
      loading: false;
      porterYamlFound: boolean;
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
  appName = "",
  useDefaults = true,
}: {
  source: (SourceOptions & { type: "github" }) | null;
  appName?: string;
  useDefaults?: boolean;
}): PorterYamlStatus => {
  const { currentProject, currentCluster } = useContext(Context);
  const [detectedServices, setDetectedServices] =
    useState<DetectedServices | null>(null);
  const [detectedName, setDetectedName] = useState<string | null>(null);
  const [porterYamlFound, setPorterYamlFound] = useState(false);
  const { nodes } = useClusterContext();
  const { newServiceDefaultCpuCores, newServiceDefaultRamMegabytes } =
    useMemo(() => {
      return getServiceResourceAllowances(
        nodes,
        currentProject?.sandbox_enabled
      );
    }, [nodes]);

  const { data, status } = useQuery(
    [
      "getPorterYamlContents",
      currentProject?.id,
      source?.git_branch,
      source?.git_repo_name,
      source?.porter_yaml_path,
    ],
    async () => {
      if (!currentProject || !source) {
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

      setPorterYamlFound(true);
      return await z.string().parseAsync(res.data);
    },
    {
      enabled:
        source?.type === "github" &&
        Boolean(source.git_repo_name) &&
        Boolean(source.git_branch),
      onError: () => {
        setPorterYamlFound(false);
      },
      refetchOnWindowFocus: false,
      retry: 0,
    }
  );

  const detectServices = useCallback(
    async ({
      b64Yaml,
      appName,
      projectId,
      clusterId,
    }: {
      b64Yaml: string;
      appName: string;
      projectId: number;
      clusterId: number;
    }) => {
      try {
        const res = await api.parsePorterYaml(
          "<token>",
          { b64_yaml: b64Yaml, app_name: appName },
          {
            project_id: projectId,
            cluster_id: clusterId,
          }
        );

        const data = await z
          .object({
            b64_app_proto: z.string(),
            env_variables: z.record(z.string()).nullable(),
            env_secrets: z.record(z.string()).nullable(),
            preview_app: z
              .object({
                b64_app_proto: z.string(),
                env_variables: z.record(z.string()).nullable(),
                env_secrets: z.record(z.string()).nullable(),
              })
              .optional(),
          })
          .parseAsync(res.data);

        const proto = PorterApp.fromJsonString(atob(data.b64_app_proto), {
          ignoreUnknownFields: true,
        });

        const { services, predeploy, build } = serviceOverrides({
          overrides: proto,
          useDefaults,
          defaultCPU: newServiceDefaultCpuCores,
          defaultRAM: newServiceDefaultRamMegabytes,
        });

        if (services.length || predeploy || build) {
          setDetectedServices({
            build,
            services,
            predeploy,
          });
        }

        if (data.preview_app) {
          const previewProto = PorterApp.fromJsonString(
            atob(data.preview_app.b64_app_proto),
            {
              ignoreUnknownFields: true,
            }
          );
          const {
            services: previewServices,
            predeploy: previewPredeploy,
            build: previewBuild,
          } = serviceOverrides({
            overrides: previewProto,
            useDefaults,
          });

          if (previewServices.length || previewPredeploy || previewBuild) {
            setDetectedServices((prev) => ({
              ...prev,
              services: prev?.services ? prev.services : [],
              previews: {
                services: previewServices,
                predeploy: previewPredeploy,
                build: previewBuild,
                variables: data.preview_app?.env_variables ?? {},
              },
            }));
          }
        }

        if (proto.name) {
          setDetectedName(proto.name);
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
      void detectServices({
        b64Yaml: data,
        appName,
        projectId: currentProject.id,
        clusterId: currentCluster.id,
      });
    }

    if (!data && detectedServices) {
      setDetectedServices(null);
    }
  }, [data]);

  if (source?.type !== "github") {
    return {
      loading: false,
      detectedName: null,
      detectedServices: null,
      porterYamlFound: false,
    };
  }

  if (status === "loading") {
    return {
      loading: true,
      detectedName: null,
      detectedServices: null,
      porterYamlFound: false,
    };
  }

  return {
    detectedServices,
    detectedName,
    loading: false,
    porterYamlFound,
  };
};
