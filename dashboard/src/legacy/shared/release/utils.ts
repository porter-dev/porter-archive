import { ChartTypeWithExtendedConfig } from "shared/types";

export const isDeployedFromGithub = (release: ChartTypeWithExtendedConfig) => {
  const githubRepository = release?.git_action_config?.git_repo;

  return !!githubRepository?.length;
};
