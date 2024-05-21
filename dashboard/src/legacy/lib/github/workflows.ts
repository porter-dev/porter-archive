import axios from "axios";

import api from "shared/api";

// GithubResultErrorCode is an enum of possible errors that may occur when hitting the Github API.
export type GithubResultErrorCode = "NO_PERMISSION" | "FILE_NOT_FOUND" | "UNKNOWN";

// GithubResult is a generic type that should be returned to handle common errors resulting from hitting the Github API.
export type GithubResult<T extends object> =
  | ({
      success: true;
    } & T)
  | {
      success: false;
      error: GithubResultErrorCode;
    };

// runGithubWorkflow attempts to rerun a given github workflow, and handles errors that may occur.
export async function runGithubWorkflow(args: {
  projectId: number;
  clusterId: number;
  gitInstallationId: number;
  owner: string;
  name: string;
  branch: string;
  filename: string;
}): Promise<GithubResult<{ url: string | null }>> {
  try {
    const {
      projectId,
      clusterId,
      gitInstallationId,
      owner,
      name,
      branch,
      filename,
    } = args;

    const res = await api.reRunGHWorkflow(
      "<token>",
      {},
      {
        project_id: projectId,
        cluster_id: clusterId,
        git_installation_id: gitInstallationId,
        owner,
        name,
        branch,
        filename,
      }
    );

    return { success: true, url: res.data };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 403) {
        return { success: false, error: "NO_PERMISSION" };
      }
      if (err.response?.status === 404) {
        return { success: false, error: "FILE_NOT_FOUND" };
      }
    }

    return { success: false, error: "UNKNOWN" };
  }
}
