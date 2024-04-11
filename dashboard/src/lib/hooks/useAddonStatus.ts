import { type ClientAddon } from "lib/addons";

type ClientAddonPod = {
  name: string;
  status: "running" | "pending" | "failed";
};
export const useAddonStatus = ({
  clusterId,
  addon,
}: {
  clusterId?: number;
  addon?: ClientAddon;
}): ClientAddonPod[] => {
  if (!clusterId || !addon) {
    return [];
  }

  return [];
};
