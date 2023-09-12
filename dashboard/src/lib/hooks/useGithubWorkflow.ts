import { useQueries } from "@tanstack/react-query";
import axios from "axios";
import { PorterAppRecord } from "main/home/app-dashboard/app-view/AppView";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { z } from "zod";

export const useGithubWorkflow = (
  porterApp: PorterAppRecord,
  previouslyBuilt: boolean
) => {
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

  const [
    {
      data: applicationWorkflowCheck,
      isLoading: isLoadingApplicationWorkflow,
    },
    { data: defaultWorkflowCheck, isLoading: isLoadingDefaultWorkflow },
  ] = useQueries({
    queries: [
      {
        queryKey: [
          `checkForApplicationWorkflow_porter_stack_${porterApp.name}`,
          currentProject?.id,
          currentCluster?.id,
          githubWorkflowFilename,
          previouslyBuilt,
        ],
        queryFn: () =>
          fetchGithubWorkflow(`porter_stack_${porterApp.name}.yml`),
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
      },
      {
        queryKey: [
          `checkForApplicationWorkflow_porter`,
          currentProject?.id,
          currentCluster?.id,
          githubWorkflowFilename,
          previouslyBuilt,
        ],
        queryFn: () => fetchGithubWorkflow("porter.yml"),
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
      },
    ],
  });

  useEffect(() => {
    if (!!applicationWorkflowCheck) {
      setGithubWorkflowName(applicationWorkflowCheck);
    } else if (!!defaultWorkflowCheck) {
      setGithubWorkflowName(defaultWorkflowCheck);
    }
  }, [applicationWorkflowCheck, defaultWorkflowCheck]);

  return {
    githubWorkflowFilename,
    isLoading: isLoadingApplicationWorkflow || isLoadingDefaultWorkflow,
    userHasGithubAccess,
  };
};
