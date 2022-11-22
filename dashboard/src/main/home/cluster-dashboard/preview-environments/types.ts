export enum DeploymentStatus {
  Failed = "failed",
  Created = "created",
  Creating = "creating",
  Inactive = "inactive",
  TimedOut = "timed_out",
  Updating = "updating",
}

export type DeploymentStatusUnion = `${DeploymentStatus}`;

export type PRDeployment = {
  id: number;
  created_at: string;
  updated_at: string;
  subdomain: string;
  status: DeploymentStatusUnion;
  environment_id: number;
  pull_request_id: number;
  namespace: string;
  last_workflow_run_url: string;
  gh_installation_id: number;
  gh_deployment_id: number;
  gh_pr_name: string;
  gh_repo_owner: string;
  gh_repo_name: string;
  gh_commit_sha: string;
  gh_pr_branch_from?: string;
  gh_pr_branch_into?: string;
};

export type EnvironmentDeploymentMode = "manual" | "auto";

export type Environment = {
  id: number;
  project_id: number;
  cluster_id: number;
  git_installation_id: number;
  name: string;
  git_repo_owner: string;
  git_repo_name: string;
  git_repo_branches: string[];
  new_comments_disabled: boolean;
  last_deployment_status: DeploymentStatusUnion;
  deployment_count: number;
  mode: EnvironmentDeploymentMode;
  namespace_labels: Record<string, string>;
};

export type PullRequest = {
  pr_title: string;
  pr_number: number;
  repo_owner: string;
  repo_name: string;
  branch_from: string;
  branch_into: string;
};
