import { useQuery } from "@tanstack/react-query";
import { ImageInfo } from "main/home/app-dashboard/new-app-flow/serviceTypes";
import { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";

export const useGithubWorkflow = (appData: any, hasBuiltImage: boolean) => {
    const { currentProject, currentCluster } = useContext(Context);
    const [githubWorkflowFilename, setGithubWorkflowName] = useState<string>("");

    const createUseQuery = (fileName: string, hasBuiltImage: boolean) => {
        return useQuery(
            [`checkForApplicationWorkflow_${fileName}`, currentProject?.id, currentCluster?.id, githubWorkflowFilename, appData, hasBuiltImage],
            async () => {
                console.log("checking for workflow file", fileName)
                console.log("here is the github workflow name", githubWorkflowFilename)
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
                refetchInterval: 5000,
                refetchOnWindowFocus: false,
            }
        );
    }

    const { data: applicationWorkflowCheck, isLoading: isLoadingApplicationWorkflow } = createUseQuery(`porter_stack_${appData?.name}.yml`, hasBuiltImage);

    const { data: defaultWorkflowCheck, isLoading: isLoadingDefaultWorkflow } = createUseQuery(`porter.yml`, hasBuiltImage);

    useEffect(() => {
        if (!!applicationWorkflowCheck) {
            setGithubWorkflowName(applicationWorkflowCheck);
        } else if (!!defaultWorkflowCheck) {
            setGithubWorkflowName(defaultWorkflowCheck);
        }
    }, [applicationWorkflowCheck, defaultWorkflowCheck]);

    return { githubWorkflowFilename, isLoading: isLoadingApplicationWorkflow || isLoadingDefaultWorkflow };
} 