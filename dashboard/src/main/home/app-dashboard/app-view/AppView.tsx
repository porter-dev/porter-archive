import React, { useContext } from "react";
import { useMemo } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import Loading from "components/Loading";
import api from "shared/api";
import { Context } from "shared/Context";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";
import { PorterApp } from "@porter-dev/api-contracts";
import styled from "styled-components";
import Back from "components/porter/Back";
import Container from "components/porter/Container";
import web from "assets/web.png";
import box from "assets/box.png";
import github from "assets/github-white.png";
import pr_icon from "assets/pull_request_icon.svg";

import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

export const porterAppValidator = z.object({
  name: z.string(),
  git_branch: z.string().optional(),
  git_repo_id: z.number().optional(),
  repo_name: z.string().optional(),
  build_context: z.string().optional(),
  builder: z.string().optional(),
  buildpacks: z.array(z.string()).optional(),
  dockerfile: z.string().optional(),
  image_repo_uri: z.string().optional(),
  porter_yaml_path: z.string().optional(),
});

// Buildpack icons
const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  web,
];

// commented out tabs are not yet implemented
// will be included as support is available based on data from app revisions rather than helm releases
const validTabs = [
  // "activity",
  // "events",
  "overview",
  // "logs",
  // "metrics",
  // "debug",
  "environment",
  "build-settings",
  "settings",
  // "helm-values",
  // "job-history",
] as const;
const DEFAULT_TAB = "activity";
type ValidTab = typeof validTabs[number];

type Props = RouteComponentProps & {};

const AppView: React.FC<Props> = ({ match }) => {
  const { currentCluster, currentProject } = useContext(Context);
  const deploymentTarget = useDefaultDeploymentTarget();

  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        appName: z.string(),
      })
      .safeParse(params);

    if (!validParams.success) {
      return {
        appName: null,
      };
    }

    return validParams.data;
  }, [match]);

  const appParamsExist =
    !!params.appName &&
    !!currentCluster &&
    !!currentProject &&
    !!deploymentTarget;

  const { data: appData, status: porterAppStatus } = useQuery(
    ["getPorterApp", currentCluster?.id, currentProject?.id, params.appName],
    async () => {
      if (!appParamsExist) {
        return;
      }

      const res = await api.getPorterApp(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          name: params.appName,
        }
      );

      const porterApp = await porterAppValidator.parseAsync(res.data);
      return porterApp;
    }
  );

  const { data: revision, status } = useQuery(
    ["getAppRevision", params.appName, "latest"],
    async () => {
      if (!appParamsExist) {
        return null;
      }

      const res = await api.getLatestRevision(
        "<token>",
        {
          deployment_target_id: deploymentTarget.deployment_target_id,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          porter_app_name: params.appName,
        }
      );

      const rawAppData = await z
        .object({
          b64_app_proto: z.string(),
        })
        .parseAsync(res.data);

      const porterApp = PorterApp.fromJsonString(
        atob(rawAppData.b64_app_proto)
      );

      return porterApp;
    },
    {
      enabled: appParamsExist,
    }
  );

  const gitData = useMemo(() => {
    if (!appData?.git_branch || !appData?.repo_name || !appData?.git_repo_id) {
      return null;
    }

    return {
      id: appData.git_repo_id,
      branch: appData.git_branch,
      repo: appData.repo_name,
    };
  }, [appData]);

  const getIconSvg = (build: PorterApp["build"]) => {
    if (!build) {
      return box;
    }

    const bp = build.buildpacks[0].split("/")[1];
    switch (bp) {
      case "ruby":
        return icons[0];
      case "nodejs":
        return icons[1];
      case "python":
        return icons[2];
      case "go":
        return icons[3];
      default:
        return box;
    }
  };

  if (
    status === "loading" ||
    porterAppStatus === "loading" ||
    !appParamsExist
  ) {
    return <Loading />;
  }

  if (status === "error" || porterAppStatus === "error" || !revision) {
    return <div>error</div>;
  }

  return (
    <StyledExpandedApp>
      <Back to="/apps" />
      <Container row>
        <Icon src={getIconSvg(revision.build)} height={"24px"} />
        <Spacer inline x={1} />
        <Text size={21}>{revision.name}</Text>
        {gitData && (
          <>
            <Spacer inline x={1} />
            <Container row>
              <A target="_blank" href={`https://github.com/${gitData.repo}`}>
                <SmallIcon src={github} />
                <Text size={13}>{gitData.repo}</Text>
              </A>
            </Container>
            <Spacer inline x={1} />
            <TagWrapper>
              Branch
              <BranchTag>
                <BranchIcon src={pr_icon} />
                {gitData.branch}
              </BranchTag>
            </TagWrapper>
          </>
        )}
      </Container>
    </StyledExpandedApp>
  );
};

export default withRouter(AppView);

const StyledExpandedApp = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
const A = styled.a`
  display: flex;
  align-items: center;
`;
const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  height: ${(props) => props.height || "15px"};
  opacity: ${(props) => props.opacity || 1};
  margin-right: 10px;
`;
const BranchIcon = styled.img`
  height: 14px;
  opacity: 0.65;
  margin-right: 5px;
`;
const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 6px;
`;
const BranchTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #ffffff22;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
