import { z } from "zod";

import {
  upstashIntegrationValidator,
  type ClientUpstashIntegration,
} from "lib/upstash/types";

import api from "shared/api";

type TUseUpstash = {
  getUpstashIntegrations: ({
    projectId,
  }: {
    projectId: number;
  }) => Promise<ClientUpstashIntegration[]>;
};
export const useUpstash = (): TUseUpstash => {
  const getUpstashIntegrations = async ({
    projectId,
  }: {
    projectId: number;
  }): Promise<ClientUpstashIntegration[]> => {
    const response = await api.getUpstashIntegrations(
      "<token>",
      {},
      {
        projectId,
      }
    );

    const results = await z
      .object({ integrations: z.array(upstashIntegrationValidator) })
      .parseAsync(response.data);

    return results.integrations;
  };

  return {
    getUpstashIntegrations,
  };
};
