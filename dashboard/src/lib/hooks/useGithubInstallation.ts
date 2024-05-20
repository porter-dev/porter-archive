import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import api from "shared/api";
import { Context } from "shared/Context";

const gitInstallationValidator = z.object({
  provider: z.enum(["github"]),
  name: z.string(),
  installation_id: z.number(),
});

type TUseGithubInstallation = {
  installation: z.infer<typeof gitInstallationValidator> | undefined;
  status: string;
};

export const useGithubInstallation = (): TUseGithubInstallation => {
  const { currentProject } = useContext(Context);

  const { data: installation, status } = useQuery(
    ["getGithubInstallation", currentProject?.id],
    async () => {
      if (!currentProject?.id) {
        return;
      }

      const res = await api.getGitProviders(
        "<token>",
        {},
        { project_id: currentProject?.id }
      );

      const installations = await z
        .array(gitInstallationValidator)
        .parseAsync(res.data);

      return installations.find(
        (installation) => installation.provider === "github"
      );
    },
    {
      enabled: !!currentProject?.id,
    }
  );

  return {
    installation,
    status,
  };
};
