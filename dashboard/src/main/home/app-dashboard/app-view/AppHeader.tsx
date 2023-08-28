import React, { useMemo } from "react";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";

import web from "assets/web.png";
import box from "assets/box.png";
import github from "assets/github-white.png";
import pr_icon from "assets/pull_request_icon.svg";

import { PorterApp } from "@porter-dev/api-contracts";
import { useLatestRevision } from "./LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import styled from "styled-components";

// Buildpack icons
const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  web,
];

const AppHeader: React.FC = () => {
  const { latestProto, porterApp } = useLatestRevision();

  const gitData = useMemo(() => {
    if (
      !porterApp.git_branch ||
      !porterApp.repo_name ||
      !porterApp.git_repo_id
    ) {
      return null;
    }

    return {
      id: porterApp.git_repo_id,
      branch: porterApp.git_branch,
      repo: porterApp.repo_name,
    };
  }, [porterApp]);

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

  return (
    <Container row>
      <Icon src={getIconSvg(latestProto.build)} height={"24px"} />
      <Spacer inline x={1} />
      <Text size={21}>{latestProto.name}</Text>
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
      {!gitData && porterApp.image_repo_uri && (
        <>
          <Spacer inline x={1} />
          <Container row>
            <SmallIcon
              height="19px"
              src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"
            />
            <Text size={13} color="helper">
              {porterApp.image_repo_uri}
            </Text>
          </Container>
        </>
      )}
    </Container>
  );
};

export default AppHeader

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
