import { useContext } from "react";
import { AddonWithEnvVars } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import {
  clientAddonFromProto,
  clientAddonToProto,
  type ClientAddon,
} from "lib/addons";

import api from "shared/api";
import { Context } from "shared/Context";
import { valueExists } from "shared/util";

export const useAddonList = ({
  clusterId,
}: {
  clusterId?: number;
}): {
  addons: ClientAddon[];
  isLoading: boolean;
  isError: boolean;
} => {
  const { currentProject } = useContext(Context);

  const {
    data: addons = [],
    isLoading,
    isError,
  } = useQuery(
    ["listAddons", currentProject?.id, clusterId],
    async () => {
      if (
        !currentProject?.id ||
        currentProject.id === -1 ||
        !clusterId ||
        clusterId === -1
      ) {
        return;
      }

      const res = await api.listLatestAddons(
        "<token>",
        {},
        {
          projectId: currentProject.id,
          clusterId,
        }
      );

      const parsed = await z
        .object({
          base64_addons: z.array(z.string()),
        })
        .parseAsync(res.data);

      const clientAddons: ClientAddon[] = parsed.base64_addons
        .map((a) => {
          const proto = AddonWithEnvVars.fromJsonString(atob(a), {
            ignoreUnknownFields: true,
          });
          if (!proto.addon) {
            return null;
          }
          return clientAddonFromProto({
            addon: proto.addon,
          });
        })
        .filter(valueExists);

      return clientAddons;
    },
    {
      enabled:
        !!currentProject?.id &&
        currentProject.id !== -1 &&
        !!clusterId &&
        clusterId !== -1,
      refetchOnWindowFocus: false,
      refetchInterval: 5000,
    }
  );

  return {
    addons,
    isLoading,
    isError,
  };
};

export const useAddon = (): {
  updateAddon: ({
    projectId,
    deploymentTargetId,
    addon,
  }: {
    projectId: number;
    deploymentTargetId: string;
    addon: ClientAddon;
  }) => Promise<void>;
} => {
  const updateAddon = async ({
    projectId,
    deploymentTargetId,
    addon,
  }: {
    projectId: number;
    deploymentTargetId: string;
    addon: ClientAddon;
  }): Promise<void> => {
    const proto = clientAddonToProto(addon);

    await api.updateAddon(
      "<token>",
      {
        b64_addon: btoa(proto.toJsonString({ emitDefaultValues: true })),
      },
      {
        projectId,
        deploymentTargetId,
      }
    );
  };

  return {
    updateAddon,
  };
};
