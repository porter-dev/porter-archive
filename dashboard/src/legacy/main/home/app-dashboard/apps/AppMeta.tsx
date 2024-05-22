import React from "react";
import box from "legacy/assets/box.png";
import git_scm from "legacy/assets/git-scm.svg";
import github from "legacy/assets/github.png";
import web from "legacy/assets/web.png";
import Container from "legacy/components/porter/Container";
import Icon from "legacy/components/porter/Icon";
import Text from "legacy/components/porter/Text";
import { type ClientPorterApp } from "legacy/lib/porter-apps";
import styled from "styled-components";

import { type AppRevisionWithSource } from "./types";

const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  web,
];

type IconProps = {
  buildpacks: string[];
  size?: string;
};

type SourceProps = {
  source:
    | {
        from: "porter_apps";
        details: AppRevisionWithSource["source"];
      }
    | {
        from: "app_contract";
        details: ClientPorterApp;
      };
};

export const AppSource: React.FC<SourceProps> = ({ source }) => {
  if (source.from === "app_contract") {
    const build = source.details.build;
    const repoFullName = build.repo
      ? new URL(build.repo).pathname.substring(1)
      : "";
    return (
      <>
        {build.repo ? (
          <Container row>
            <SmallIcon opacity="0.6" src={github} />
            <Text truncate={true} size={13} color="#ffffff44">
              {repoFullName.endsWith(".git")
                ? repoFullName.slice(0, -4)
                : repoFullName}
            </Text>
          </Container>
        ) : (
          <Container row>
            <SmallIcon opacity="0.6" height="18px" src={box} />
            <Text truncate={true} size={13} color="#ffffff44">
              {source.details.name.value}
            </Text>
          </Container>
        )}
      </>
    );
  }

  return (
    <>
      {source.details.image_repo_uri ? (
        <Container row>
          <SmallIcon
            opacity="0.7"
            height="18px"
            src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"
          />
          <Text truncate={true} size={13} color="#ffffff44">
            {source.details.image_repo_uri}
          </Text>
        </Container>
      ) : source.details.repo_name ? (
        <Container row>
          <SmallIcon opacity="0.6" src={github} />
          <Text truncate={true} size={13} color="#ffffff44">
            {source.details.repo_name}
          </Text>
        </Container>
      ) : (
        <Container row>
          <SmallIcon src={git_scm} />
          <Text truncate={true} size={13} color="#ffffff44">
            {source.details.name}
          </Text>
        </Container>
      )}
    </>
  );
};

export const AppIcon: React.FC<IconProps> = ({ buildpacks, size }) => {
  let src = box;
  if (buildpacks.length) {
    const [_, name] = buildpacks[0].split("/");
    switch (name) {
      case "ruby":
        src = icons[0];
        break;
      case "nodejs":
        src = icons[1];
        break;
      case "python":
        src = icons[2];
        break;
      case "go":
        src = icons[3];
        break;
      default:
        break;
    }
  }

  return size === "larger" ? (
    <Icon height="16px" src={src} />
  ) : (
    <Icon height="18px" src={src} />
  );
};

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  margin-left: 2px;
  height: ${(props) => props.height || "14px"};
  opacity: ${(props) => props.opacity || 1};
  filter: grayscale(100%);
  margin-right: 10px;
`;
