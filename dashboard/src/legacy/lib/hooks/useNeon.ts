import {
  neonIntegrationValidator,
  type ClientNeonIntegration,
} from "legacy/lib/neon/types";
import api from "legacy/shared/api";
import { z } from "zod";

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
