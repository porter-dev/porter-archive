import React, { useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { z } from "zod";

import Banner from "components/porter/Banner";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import { useGithubWorkflow } from "lib/hooks/useGithubWorkflow";
import { appRevisionValidator } from "lib/revisions/types";

import api from "shared/api";
import { Context } from "shared/Context";

import { HELLO_PORTER_PLACEHOLDER_TAG } from "../../app-view/AppHeader";
import { useLatestRevision } from "../../app-view/LatestRevisionContext";
import GHABanner from "../../expanded-app/GHABanner";

const GHStatusBanner: React.FC = () => {
  const { setCurrentModal } = useContext(Context);
  const {
    porterApp,
    projectId,
    clusterId,
    latestRevision,
    appName,
    deploymentTarget,
    latestProto,
  } = useLatestRevision();

  const { data: revisions = [], status } = useQuery(
    [
      "listAppRevisions",
      projectId,
      clusterId,
      latestRevision.revision_number,
      appName,
    ],
    async () => {
      const res = await api.listAppRevisions(
        "<token>",
        {
          deployment_target_id: deploymentTarget.id,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
          porter_app_name: appName,
        }
      );

      const { app_revisions: appRevisions } = await z
        .object({
          app_revisions: z.array(appRevisionValidator),
        })
        .parseAsync(res.data);

      return appRevisions;
    }
  );

  const previouslyBuilt = useMemo(() => {
    if (revisions.length === 1) {
      if (
        // TODO: remove checking for DEPLOYED status once update flow is released,
        // because once that happens, the new terminal status will be DEPLOYMENT_SUCCESSFUL
        (revisions[0].status === "DEPLOYMENT_SUCCESSFUL" ||
          revisions[0].status === "DEPLOYED") &&
        latestProto.image?.tag === HELLO_PORTER_PLACEHOLDER_TAG
      ) {
        return false;
      }
    }
    return revisions.some((r) =>
      match(r.status)
        .with(
          "AWAITING_PREDEPLOY",
          "DEPLOYED",
          "DEPLOY_FAILED",
          "BUILD_FAILED",
          "IMAGE_AVAILABLE",
          "DEPLOYMENT_PROGRESSING",
          "DEPLOYMENT_SUCCESSFUL",
          "DEPLOYMENT_FAILED",
          () => true
        )
        .otherwise(() => false)
    );
  }, [revisions]);

  const { githubWorkflowFilename, userHasGithubAccess, isLoading } =
    useGithubWorkflow({
      porterApp,
      previouslyBuilt,
      fileNames: ["porter.yml", `porter_stack_${porterApp.name}.yml`],
    });

  if (
    previouslyBuilt ||
    !!porterApp.image_repo_uri ||
    status === "loading" ||
    status === "error"
  ) {
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
