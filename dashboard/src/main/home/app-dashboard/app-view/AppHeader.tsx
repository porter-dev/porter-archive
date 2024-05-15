import React, { useMemo } from "react";
import { type PorterApp } from "@porter-dev/api-contracts";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { prefixSubdomain } from "lib/porter-apps/services";

import PullRequestIcon from "shared/icons/PullRequest";
import { readableDate } from "shared/string_utils";
import box from "assets/box.png";
import github from "assets/github-white.png";
import pull_request_icon from "assets/pull_request_icon.svg";
import tag_icon from "assets/tag.png";
import web from "assets/web.png";

import GHStatusBanner from "../validate-apply/revisions-list/GHStatusBanner";
import { useLatestRevision } from "./LatestRevisionContext";
import {
  Code,
  CommitIcon,
  ImageTagContainer,
} from "./tabs/activity-feed/events/cards/EventCard";

// Buildpack icons
const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  web,
];

export const HELLO_PORTER_PLACEHOLDER_TAG = "porter-initial-image";

const AppHeader: React.FC = () => {
  const {
    latestProto,
    porterApp,
    latestRevision,
    deploymentTarget,
    latestSource,
  } = useLatestRevision();

  const gitCommitUrl = useMemo(() => {
    if (!porterApp.repo_name) {
      return "";
    }
    if (!latestProto.build?.commitSha) {
      return "";
    }

    return `https://www.github.com/${porterApp.repo_name}/commit/${latestProto.build.commitSha}`;
  }, [JSON.stringify(latestProto), porterApp]);

  const displayCommitSha = useMemo(() => {
    if (
      !latestProto.build?.commitSha ||
      latestProto.build.commitSha.length < 7
    ) {
      return "";
    }

    return latestProto.build.commitSha.slice(0, 7);
  }, [JSON.stringify(latestProto), porterApp]);

  const getIconSvg = (build: PorterApp["build"]): JSX.Element => {
    if (!build) {
      return box;
    }

    const bp = build.buildpacks[0]?.split("/")[1];
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

  const renderTagBadge = (tag: string): JSX.Element => {
    if (tag === HELLO_PORTER_PLACEHOLDER_TAG) {
      return (
        <ImageTagContainer hoverable={false}>
          <TagContainer>
            <StatusDot color="#FFA500" />
            <Code>Awaiting dgieploy</Code>
          </TagContainer>
        </ImageTagContainer>
      );
    }

    return (
      <ImageTagContainer hoverable={false}>
        <TagContainer>
          <CommitIcon src={tag_icon} />
          <Code>{tag}</Code>
        </TagContainer>
      </ImageTagContainer>
    );
  };

  const displayDomain = useMemo(() => {
    const domains = latestProto.serviceList.reduce((acc: string[], s) => {
      if (s.config.case === "webConfig") {
        const names = s.config.value.domains.map((d) => d.name);
        return [...acc, ...names];
      }

      return acc;
    }, []);

    // we only show the custom domain if 1 exists; if no custom domain exists, we show the porter domain, if one exists
    const nonPorterDomains = domains.filter(
      (n: string) =>
        !n.endsWith(".onporter.run") && !n.endsWith(".withporter.run")
    );
    if (nonPorterDomains.length) {
      if (nonPorterDomains.length === 1) {
        return nonPorterDomains[0];
      }
    } else {
      const porterDomains = domains.filter(
        (n: string) =>
          n.endsWith(".onporter.run") || n.endsWith(".withporter.run")
      );
      if (porterDomains.length === 1) {
        return porterDomains[0];
      }
    }

    return "";
  }, [latestProto]);

  return (
    <>
      <Container row>
        <Icon src={getIconSvg(latestProto.build)} height={"24px"} />
        <Spacer inline x={1} />
        <Text size={21}>{latestProto.name}</Text>
        <Spacer inline x={1} />

        <Container
          row
          style={{
            display: "flex",
            alignItems: "center",
            height: "24px",
          }}
        >
          {match(latestSource)
            .with({ type: "github" }, (s) => (
              <>
                <Spacer inline x={1} />
                <Container row>
                  <A
                    target="_blank"
                    href={`https://github.com/${s.git_repo_name}`}
                  >
                    <SmallIcon src={github} />
                    <Text size={13}>{s.git_repo_name}</Text>
                  </A>
                </Container>
                <Spacer inline x={1} />
                <TagWrapper preview={deploymentTarget.is_preview}>
                  {deploymentTarget.is_preview ? "Preview" : "Branch"}
                  <BranchTag preview={deploymentTarget.is_preview}>
                    <PullRequestIcon
                      styles={{
                        height: "14px",
                        opacity: "0.65",
                        marginRight: "5px",
                        fill: deploymentTarget.is_preview ? "" : "#fff",
                      }}
                    />
                    {deploymentTarget.is_preview
                      ? deploymentTarget.name
                      : s.git_branch}
                  </BranchTag>
                </TagWrapper>
              </>
            ))
            .with({ type: "docker-registry" }, (s) => (
              <>
                <SmallIcon
                  height="19px"
                  src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"
                />
                <Text size={13} color="helper">
                  {s.image.repository}
                </Text>
                {deploymentTarget.is_preview && (
                  <>
                    <Spacer inline x={1} />
                    <TagWrapper preview>
                      Preview
                      <BranchTag preview>
                        <PullRequestIcon
                          styles={{
                            height: "14px",
                            opacity: "0.65",
                            marginRight: "5px",
                            fill: "",
                          }}
                        />
                        {deploymentTarget.name}
                      </BranchTag>
                    </TagWrapper>
                  </>
                )}
              </>
            ))
            .otherwise(() => null)}
        </Container>
      </Container>
      <Spacer y={0.5} />
      {displayDomain && (
        <>
          <Container>
            <Text>
              <a
                href={prefixSubdomain(displayDomain)}
                target="_blank"
                rel="noreferrer"
              >
                {displayDomain}
              </a>
            </Text>
          </Container>
          <Spacer y={0.5} />
        </>
      )}
      <LatestDeployContainer>
        <div style={{ flexShrink: 0 }}>
          <Text color="#aaaabb66">
            Last deployed {readableDate(latestRevision.created_at)}
          </Text>
        </div>
        <Spacer y={0.5} />
        <NoShrink>
          {match(latestSource)
            .with({ type: "github" }, () =>
              displayCommitSha ? (
                <ImageTagContainer>
                  <Link
                    to={gitCommitUrl}
                    target="_blank"
                    showTargetBlankIcon={false}
                  >
                    <CommitIcon src={pull_request_icon} />
                    <Code>{displayCommitSha}</Code>
                  </Link>
                </ImageTagContainer>
              ) : latestProto.image?.tag ? (
                renderTagBadge(latestProto.image.tag)
              ) : null
            )
            .with({ type: "local" }, () =>
              displayCommitSha ? (
                <ImageTagContainer>
                  <Link
                    to={gitCommitUrl}
                    target="_blank"
                    showTargetBlankIcon={false}
                  >
                    <CommitIcon src={pull_request_icon} />
                    <Code>{displayCommitSha}</Code>
                  </Link>
                </ImageTagContainer>
              ) : latestProto.image?.tag ? (
                renderTagBadge(latestProto.image.tag)
              ) : null
            )
            .with({ type: "docker-registry" }, (s) =>
              renderTagBadge(latestProto.image?.tag ?? s.image.tag)
            )
            .exhaustive()}
        </NoShrink>
        <Spacer y={0.5} />
      </LatestDeployContainer>
      <Spacer y={0.5} />
      {latestSource.type === "github" && <GHStatusBanner />}
      <Spacer y={0.5} />
    </>
  );
};

export default AppHeader;

const A = styled.a`
  display: flex;
  align-items: center;
`;
const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  height: ${(props) => props.height ?? "15px"};
  opacity: ${(props) => props.opacity ?? 1};
  margin-right: 10px;
`;

const LatestDeployContainer = styled.div`
  display: inline-flex;
  column-gap: 6px;
`;

const TagContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 1px;
  padding: 0px 2px;
`;

const NoShrink = styled.div`
  display: inline-flex;
  flex-shrink: 0;
`;

const TagWrapper = styled.div<{ preview?: boolean }>`
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => (props.preview ? "#fefce8" : "")};
  color: ${(props) => (props.preview ? "#ca8a04" : "#ffffff44")};
  border: 1px solid ${(props) => (props.preview ? "#ca8a04" : "#ffffff44")};
  border-radius: 3px;
  padding-left: 6px;
`;

const BranchTag = styled.div<{ preview?: boolean }>`
  height: 20px;
  margin-left: 6px;
  color: ${(props) => (props.preview ? "#ca8a04" : "#aaaabb")};
  background: ${(props) => (props.preview ? "#fefce8" : "#ffffff22")};
  border: 1px solid ${(props) => (props.preview ? "#ca8a04" : "#ffffff44")};
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

const StatusDot = styled.div<{ color?: string }>`
  min-width: 7px;
  max-width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 10px;
  background: ${(props) => props.color ?? "#38a88a"};

  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
  transform: scale(1);
  animation: pulse 2s infinite;
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }

    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
  }
`;
