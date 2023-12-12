import React from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Text from "components/porter/Text";

import box from "assets/box.png";
import github from "assets/github.png";
import web from "assets/web.png";

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
  source: AppRevisionWithSource["source"];
};

export const AppSource: React.FC<SourceProps> = ({ source }) => {
  return (
    <>
      {source.repo_name ? (
        <Container row>
          <SmallIcon opacity="0.6" src={github} />
          <Text truncate={true} size={13} color="#ffffff44">
            {source.repo_name}
          </Text>
        </Container>
      ) : (
        <Container row>
          <SmallIcon
            opacity="0.7"
            height="18px"
            src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"
          />
          <Text truncate={true} size={13} color="#ffffff44">
            {source.image_repo_uri}
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
