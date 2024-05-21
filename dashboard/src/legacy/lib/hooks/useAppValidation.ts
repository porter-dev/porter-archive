import { useCallback, useContext } from "react";
import { type PorterApp } from "@porter-dev/api-contracts";
import { match } from "ts-pattern";
import { z } from "zod";

import {
  clientAppToProto,
  type ClientPorterApp,
  type PorterAppFormData,
  type SourceOptions,
} from "lib/porter-apps";

import api from "shared/api";
import { Context } from "shared/Context";

export type AppValidationResult = {
  validatedAppProto: PorterApp;
  variables: Record<string, string>;
  secrets: Record<string, string>;
  commitSha: string;
};

type ServiceDeletions = Record<
  string,
  {
    domain_names: string[];
    ingress_annotation_keys: string[];
  }
>;

type AppValidationHook = {
  validateApp: (data: PorterAppFormData) => Promise<AppValidationResult>;
  setServiceDeletions: (
    services: ClientPorterApp["services"]
  ) => ServiceDeletions;
};

export const useAppValidation = ({
  deploymentTargetID,
  creating = false,
}: {
  deploymentTargetID?: string;
  creating?: boolean;
}): AppValidationHook => {
  const { currentProject, currentCluster } = useContext(Context);

  const setServiceDeletions = (
    services: ClientPorterApp["services"]
  ): ServiceDeletions => {
    const serviceDeletions = services.reduce(
      (
        acc: Record<
          string,
          { domain_names: string[]; ingress_annotation_keys: string[] }
        >,
        svc
      ) => {
        acc[svc.name.value] = {
          domain_names: svc.domainDeletions.map((d) => d.name),
          ingress_annotation_keys: svc.ingressAnnotationDeletions.map(
            (ia) => ia.key
          ),
        };

        return acc;
      },
      {}
    );

    return serviceDeletions;
  };

  const getBranchHead = async ({
    projectID,
    source,
  }: {
    projectID: number;
    source: SourceOptions & {
      type: "github";
    };
  }): Promise<string> => {
    const [owner, repoName] = await z
      .tuple([z.string(), z.string()])
      .parseAsync(source.git_repo_name?.split("/"));

    const res = await api.getBranchHead(
      "<token>",
      {},
      {
        ...source,
        project_id: projectID,
        kind: "github",
        owner,
        name: repoName,
        branch: source.git_branch,
      }
    );

    const commitData = await z
      .object({
        commit_sha: z.string(),
      })
      .parseAsync(res.data);

    return commitData.commit_sha;
  };

  const validateApp = useCallback(
    async (data: PorterAppFormData): Promise<AppValidationResult> => {
      if (!currentProject || !currentCluster) {
        throw new Error("No project or cluster selected");
      }

      if (!deploymentTargetID) {
        throw new Error("No deployment target selected");
      }

      const { env } = data.app;
      const variables = env
        .filter(
          (e) =>
            !e.hidden && !e.deleted && e.value.length > 0 && e.key.length > 0
        )
        .reduce((acc: Record<string, string>, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
      const secrets = env
        .filter((e) => !e.deleted && e.value.length > 0 && e.key.length > 0)
        .reduce((acc: Record<string, string>, item) => {
          if (item.hidden) {
            acc[item.key] = item.value;
          }
          return acc;
        }, {});

      const proto = clientAppToProto(data);

      const commitSha = await match(data.source)
        .with({ type: "github" }, async (src) => {
          if (!creating) {
            return "";
          }

          return await getBranchHead({
            projectID: currentProject.id,
            source: src,
          });
        })
        .with({ type: "docker-registry" }, { type: "local" }, () => {
          return "";
        })
        .exhaustive();

      return { validatedAppProto: proto, variables, secrets, commitSha };
    },
    [deploymentTargetID, currentProject, currentCluster]
  );

  return {
    validateApp,
    setServiceDeletions,
  };
};
