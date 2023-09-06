import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";

export const useGithubWorkflow = (appData: any, hasBuiltImage: boolean) => {
    const { currentProject, currentCluster } = useContext(Context);
    const [githubWorkflowFilename, setGithubWorkflowName] = useState<string>("");
    const [userHasGithubAccess, setUserHasGithubAccess] = useState<boolean>(true);

    const createUseQuery = (fileName: string) => {
        return useQuery(
            [`checkForApplicationWorkflow_${fileName}`, currentProject?.id, currentCluster?.id, githubWorkflowFilename, appData, hasBuiltImage],
            async () => {
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
                        git_repo_id: appData.git_repo_id,
                        kind: "github",
                        owner: appData.repo_name.split("/")[0],
                        name: appData.repo_name.split("/")[1],
                        branch: appData.git_branch,
                    }
                );

                if (res.data) {
                    return fileName;
                }
            },
            {
                enabled: !hasBuiltImage && !!currentProject && !!currentCluster && !!appData && githubWorkflowFilename === "",
                retryDelay: 5000,
                retry: (_failureCount, error) => {
                    if (error.response?.status === 403) {
                        setUserHasGithubAccess(false);
                    }
                    return true;
                },
                refetchOnWindowFocus: false,
            }
        );
    }

    const { data: applicationWorkflowCheck, isLoading: isLoadingApplicationWorkflow } = createUseQuery(`porter_stack_${appData?.name}.yml`);

    const { data: defaultWorkflowCheck, isLoading: isLoadingDefaultWorkflow } = createUseQuery(`porter.yml`);

    useEffect(() => {
        if (!!applicationWorkflowCheck) {
            setGithubWorkflowName(applicationWorkflowCheck);
        } else if (!!defaultWorkflowCheck) {
            setGithubWorkflowName(defaultWorkflowCheck);
        }
    }, [applicationWorkflowCheck, defaultWorkflowCheck]);

    return { githubWorkflowFilename, isLoading: isLoadingApplicationWorkflow || isLoadingDefaultWorkflow, userHasGithubAccess };
} 