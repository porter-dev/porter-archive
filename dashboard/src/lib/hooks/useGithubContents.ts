import { useQuery } from "@tanstack/react-query";
import api from "shared/api";

type UseGithubContentsOptions = {
    owner: string;
    repo: string;
    branch: string;
    path: string;
};

export const useGithubContents = ({
    owner,
    repo,
    branch,
    path,
}: UseGithubContentsOptions) => {
    const queryKey = ['githubContents', owner, repo, branch, path];

    return useQuery(queryKey, async () => {
        const { data } = await api.getBranchContents({
            owner,
            repo,
            branch,
            path,
        });

        return data;
    });
};
