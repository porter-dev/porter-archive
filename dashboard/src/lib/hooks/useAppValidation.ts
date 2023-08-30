import { PorterApp } from "@porter-dev/api-contracts";
import {
  PorterAppFormData,
  SourceOptions,
  clientAppToProto,
} from "lib/porter-apps";
import { useCallback, useContext } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { match } from "ts-pattern";
import { z } from "zod";

export const useAppValidation = ({
  deploymentTargetID,
}: {
  deploymentTargetID?: string;
}) => {
  const { currentProject, currentCluster } = useContext(Context);

  const getBranchHead = async ({
    projectID,
    source,
  }: {
    projectID: number;
    source: SourceOptions & {
      type: "github";
    };
  }) => {
    const [owner, repo_name] = await z
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
        name: repo_name,
        branch: source.git_branch,
      }
    );

    const commitData = await z
      .object({
        commit_sha: z.string(),
      })
      .parseAsync(res.data);

    return commitData;
  };

  const validateApp = useCallback(
    async (data: PorterAppFormData) => {
      if (!currentProject || !currentCluster) {
        throw new Error("No project or cluster selected");
      }

      if (!deploymentTargetID) {
        throw new Error("No deployment target selected");
      }

      const proto = clientAppToProto(data);
      const commit_sha = await match(data.source)
        .with({ type: "github" }, async (src) => {
          const { commit_sha } = await getBranchHead({
            projectID: currentProject.id,
            source: src,
          });
          return commit_sha;
        })
        .with({ type: "docker-registry" }, () => {
          return "";
        })
        .exhaustive();

      const res = await api.validatePorterApp(
        "<token>",
        {
          b64_app_proto: btoa(
            proto.toJsonString({
              emitDefaultValues: true,
            })
          ),
          deployment_target_id: deploymentTargetID,
          commit_sha,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );

      const validAppData = await z
        .object({
          validate_b64_app_proto: z.string(),
        })
        .parseAsync(res.data);

      const validatedAppProto = PorterApp.fromJsonString(
        atob(validAppData.validate_b64_app_proto)
      );

      return validatedAppProto;
    },
    [deploymentTargetID, currentProject, currentCluster]
  );

  return {
    validateApp,
  };
};
