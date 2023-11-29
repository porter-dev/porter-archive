import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

import { type PorterAppRecord } from "main/home/app-dashboard/app-view/AppView";

import api from "shared/api";
import { Context } from "shared/Context";

type WorkflowResult = {
  githubWorkflowFilename: string;
  isLoading: boolean;
  userHasGithubAccess: boolean;
};

export const useGithubWorkflow = ({
  porterApp,
  fileNames,
  previouslyBuilt = false,
}: {
  porterApp: PorterAppRecord;
  fileNames: string[];
  previouslyBuilt?: boolean;
}): WorkflowResult => {
  const { currentProject, currentCluster } = useContext(Context);
  const [githubWorkflowFilename, setGithubWorkflowName] = useState<string>("");
  const [userHasGithubAccess, setUserHasGithubAccess] = useState<boolean>(true);

  const gitMetadata = useMemo(() => {
    const repoNameParts = z
      .tuple([z.string(), z.string()])
      .safeParse(porterApp.repo_name?.split("/"));
    if (
      !repoNameParts.success ||
      !porterApp.git_repo_id ||
      !porterApp.git_branch
    ) {
      return {
        repo_id: 0,
        owner: "",
        name: "",
        branch: "",
      };
    }

    return {
      repo_id: porterApp.git_repo_id,
      owner: repoNameParts.data[0],
      name: repoNameParts.data[1],
      branch: porterApp.git_branch,
    };
  }, [porterApp.git_repo_id, porterApp.repo_name, porterApp.git_branch]);

  const fetchGithubWorkflow = useCallback(
    async (fileName: string) => {
      try {
        if (githubWorkflowFilename !== "") {
          return githubWorkflowFilename;
        }

        if (currentProject == null || currentCluster == null) {
          return "";
        }

        const res = await api.getBranchContents(
          "<token>",
          {
            dir: `./.github/workflows/${fileName}`,
          },
          {
            project_id: currentProject.id,
            git_repo_id: gitMetadata.repo_id,
            kind: "github",
            owner: gitMetadata.owner,
            name: gitMetadata.name,
            branch: gitMetadata.branch,
          }
        );

        if (res.data) {
          return fileName;
        }

        return "";
      } catch (err) {
        return "";
      }
    },
    [currentProject, currentCluster, gitMetadata, githubWorkflowFilename]
  );

  const enabled =
    !previouslyBuilt &&
    !!currentProject &&
    !!currentCluster &&
    githubWorkflowFilename === "";

  const results = useQueries({
    queries: fileNames.map((fn) => ({
      queryKey: [
        `checkForApplicationWorkflow_${fn}`,
        currentProject?.id,
        currentCluster?.id,
        fn,
        previouslyBuilt,
      ],
      queryFn: async () => await fetchGithubWorkflow(fn),
      enabled,
      refetchInterval: 5000,
      retry: (_failureCount: number, error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setUserHasGithubAccess(false);
          return false;
        }

        return true;
      },
      refetchOnWindowFocus: false,
    })),
  });

  useEffect(() => {
    const applicationWorkflowCheck = results
      .map(({ data }) => data)
      .find((d) => !!d);
    if (applicationWorkflowCheck) {
      setGithubWorkflowName(applicationWorkflowCheck);
    }
  }, [results]);

  return {
    githubWorkflowFilename,
    isLoading: results.some((r) => r.isLoading),
    userHasGithubAccess,
  };
};
