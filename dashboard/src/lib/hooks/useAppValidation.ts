import { PorterApp } from "@porter-dev/api-contracts";
import { PorterAppFormData, clientAppToProto } from "lib/porter-apps";
import { useCallback, useContext } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { z } from "zod";

export const useAppValidation = ({
  deploymentTargetID,
}: {
  deploymentTargetID?: string;
}) => {
  const { currentProject, currentCluster } = useContext(Context);

  const validateApp = useCallback(
    async (data: PorterAppFormData) => {
      if (!currentProject || !currentCluster) {
        throw new Error("No project or cluster selected");
      }

      if (!deploymentTargetID) {
        throw new Error("No deployment target selected");
      }

      const proto = clientAppToProto(data);

      const res = await api.validatePorterApp(
        "<token>",
        {
          b64_app_proto: btoa(
            proto.toJsonString({
              emitDefaultValues: true,
            })
          ),
          deployment_target_id: deploymentTargetID,
          commit_sha: "", // not sending a commit sha since the CLI will handle this
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
