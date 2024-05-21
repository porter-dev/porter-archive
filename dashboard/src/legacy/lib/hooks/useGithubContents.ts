import { useQuery } from "@tanstack/react-query";
import _ from "lodash";
import { useEffect, useState } from "react";
import api from "shared/api";
import { z } from "zod";

type UseGithubContentsOptions = {
    repoId: number;
    repoOwner: string;
    repoName: string;
    branch: string;
    path: string;
    projectId: number;
};

const githubContentsValidator = z.discriminatedUnion("type", [
    z.object({
        path: z.string(),
        type: z.literal("file"),
    }),
    z.object({
        path: z.string(),
        type: z.literal("dir"),
    }),
    z.object({
        path: z.string(),
        type: z.literal("symlink"),
    }),
]);
type GithubContents = z.infer<typeof githubContentsValidator>;

export const useGithubContents = ({
    repoId,
    repoOwner,
    repoName,
    branch,
    path,
    projectId,
}: UseGithubContentsOptions) => {
    const [contents, setContents] = useState<GithubContents[]>([]);
    
    const result = useQuery(
        ["getGithubContentsAtPath", repoOwner, repoName, branch, path],
        async () => {
            const res = await api.getBranchContents(
                "<token>", 
                {
                    dir: path,
                },
                {
                    kind: "github",
                    project_id: projectId,
                    git_repo_id: repoId,
                    owner: repoOwner,
                    name: repoName,
                    branch,
                }
            );

            const parsed = await z.array(githubContentsValidator).parseAsync(res.data);
            return parsed;
        }
    );

    useEffect(() => {
        if (result.isSuccess) {
            const folders = result.data.filter((c) => c.type === "dir").sort((a, b) => a.path.localeCompare(b.path));
            const files = result.data.filter((c) => c.type === "file").sort((a, b) => a.path.localeCompare(b.path));
            const updatedContents = [...folders, ...files];
    
            if (!_.isEqual(updatedContents, contents)) {
                setContents(updatedContents);
            }
        }
    }, [result, contents]);

    return {
        contents,
        isLoading: result.isLoading,
    }
};
