import React, { useContext, useMemo } from "react";
import { useLatestRevision } from "../../app-view/LatestRevisionContext";
import { Context } from "shared/Context";
import { useGithubWorkflow } from "lib/hooks/useGithubWorkflow";
import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import GHABanner from "../../expanded-app/GHABanner";
import { match } from "ts-pattern";
import { AppRevision } from "lib/revisions/types";

type GHStatusBannerProps = {
  revisions: AppRevision[];
};

const GHStatusBanner: React.FC<GHStatusBannerProps> = ({ revisions }) => {
  const { setCurrentModal } = useContext(Context);
  const { porterApp } = useLatestRevision();

  const previouslyBuilt = useMemo(() => {
    return revisions.some((r) =>
      match(r.status)
        .with(
          "AWAITING_PREDEPLOY",
          "READY_TO_APPLY",
          "DEPLOYED",
          "DEPLOY_FAILED",
          "BUILD_FAILED",
          () => true
        )
        .otherwise(() => false)
    );
  }, [revisions]);

  const {
    githubWorkflowFilename,
    userHasGithubAccess,
    isLoading,
  } = useGithubWorkflow({
    porterApp,
    previouslyBuilt,
    fileNames: ["porter.yml", `porter_stack_${porterApp.name}.yml`],
  });

  if (previouslyBuilt) {
    return null;
  }

  if (!userHasGithubAccess) {
    return (
      <Banner type="warning">
        You do not have access to the GitHub repo associated with this
        application.
        <Spacer inline width="5px" />
        <Link
          hasunderline
          onClick={() => setCurrentModal?.("AccountSettingsModal", {})}
        >
          Check account settings
        </Link>
      </Banner>
    );
  }

  if (githubWorkflowFilename) {
    return (
      <Banner>
        Your GitHub repo has not been built yet.
        <Spacer inline width="5px" />
        <Link
          hasunderline
          target="_blank"
          to={`https://github.com/${porterApp.repo_name}/actions`}
        >
          Check status
        </Link>
      </Banner>
    );
  }

  if (!isLoading) {
    return (
      <GHABanner
        repoName={porterApp.repo_name ?? ""}
        branchName={porterApp.git_branch ?? ""}
        pullRequestUrl={porterApp.pull_request_url ?? ""}
        stackName={porterApp.name}
        gitRepoId={porterApp.git_repo_id ?? 0}
        porterYamlPath={porterApp.porter_yaml_path}
      />
    );
  }

  return null;
};

export default GHStatusBanner;
