export type PRDeployment = {
  id: number;
  created_at: string;
  updated_at: string;
  subdomain: string;
  status: "creating" | "failed" | "created" | "inactive";
  environment_id: number;
  pull_request_id: number;
  namespace: string;
  gh_pr_name: string;
  gh_repo_owner: string;
  gh_repo_name: string;
  gh_commit_sha: string;
  gh_pr_branch_from?: string;
  gh_pr_branch_into?: string;
};

export type Environment = {
  id: number;
  project_id: number;
  cluster_id: number;
  git_installation_id: number;
  name: string;
  git_repo_owner: string;
  git_repo_name: string;
  last_deployment_status: "failed" | "created" | "inactive" | "disabled";
  deployment_count: number;
  mode: "manual" | "auto";
};

export type PullRequest = {
  pr_title: string;
  pr_number: number;
  repo_owner: string;
  repo_name: string;
  branch_from: string;
  branch_into: string;
};
