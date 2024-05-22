import { z } from "zod";

import {
  neonIntegrationValidator,
  type ClientNeonIntegration,
} from "lib/neon/types";

import api from "shared/api";

type TUseNeon = {
  getNeonIntegrations: ({
    projectId,
  }: {
    projectId: number;
  }) => Promise<ClientNeonIntegration[]>;
};
export const useNeon = (): TUseNeon => {
  const getNeonIntegrations = async ({
    projectId,
  }: {
    projectId: number;
  }): Promise<ClientNeonIntegration[]> => {
    const response = await api.getNeonIntegrations(
      "<token>",
      {},
      {
        projectId,
      }
    );

    const results = await z
      .object({ integrations: z.array(neonIntegrationValidator) })
      .parseAsync(response.data);

    return results.integrations;
  };

  return {
    getNeonIntegrations,
  };
};
