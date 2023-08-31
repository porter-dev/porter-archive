import React, { useMemo } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { z } from "zod";
import styled from "styled-components";

import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";

import AppDataContainer from "./AppDataContainer";

import web from "assets/web.png";
import AppHeader from "./AppHeader";
import { LatestRevisionProvider } from "./LatestRevisionContext";

export const porterAppValidator = z.object({
  name: z.string(),git_branch: z.string().optional(),
  git_repo_id: z.number().optional(),
  repo_name: z.string().optional(),
  build_context: z.string().optional(),
  builder: z.string().optional(),
  buildpacks: z.array(z.string()).optional(),
  dockerfile: z.string().optional(),
  image_repo_uri: z.string().optional(),
  porter_yaml_path: z.string().optional(),
});
export type PorterAppRecord = z.infer<typeof porterAppValidator>;

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
  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        appName: z.string(),
        tab: z.string().optional(),
      })
      .safeParse(params);

    if (!validParams.success) {
      return {
        appName: undefined,
        tab: undefined,
      };
    }

    return validParams.data;
  }, [match]);

  return (
    <LatestRevisionProvider appName={params.appName}>
      <StyledExpandedApp>
        <Back to="/apps" />
        <AppHeader />
        <Spacer y={0.5} />
        <AppDataContainer tabParam={params.tab} />
      </StyledExpandedApp>
    </LatestRevisionProvider>
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
