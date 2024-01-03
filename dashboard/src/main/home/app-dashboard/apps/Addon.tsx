import React, { useMemo } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import CopyToClipboard from "components/CopyToClipboard";
import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientAddon } from "lib/addons";

import { useDeploymentTarget } from "shared/DeploymentTargetContext";
import copy from "assets/copy-left.svg";
import postgresql from "assets/postgresql.svg";

import { Block, Row } from "./AppGrid";

type AddonProps = {
  addon: ClientAddon;
  view: "grid" | "list";
};

export const Addon: React.FC<AddonProps> = ({ addon, view }) => {
  const { currentDeploymentTarget } = useDeploymentTarget();

  const endpoint = useMemo(() => {
    if (!currentDeploymentTarget) return "";
    if (!addon.name.value) return "";

    return `${addon.name.value}-postgres.${currentDeploymentTarget.namespace}.svc.cluster.local:5432`;
  }, [currentDeploymentTarget, addon.name.value]);

  return match(view)
    .with("grid", () => (
      <Block locked>
        <Container row>
          <Spacer inline width="1px" />
          <Icon height="16px" src={postgresql} />
          <Spacer inline width="12px" />
          <Text size={14}>{addon.name.value}</Text>
          <Spacer inline x={2} />
        </Container>
        <div>
          <Text color="helper">Endpoint</Text>
          <Spacer y={0.1} />
          <IdContainer>
            <Text size={10} truncate>
              <Code>{endpoint}</Code>
            </Text>
            <CopyContainer>
              <CopyToClipboard text={endpoint}>
                <CopyIcon src={copy} alt="copy" />
              </CopyToClipboard>
            </CopyContainer>
          </IdContainer>
        </div>
      </Block>
    ))
    .with("list", () => (
      <Row locked>
        <Container row>
          <Spacer inline width="1px" />
          <Icon height="16px" src={postgresql} />
          <Spacer inline width="12px" />
          <Text size={14}>{addon.name.value}</Text>
          <Spacer inline x={1} />
        </Container>
        <Spacer height="15px" />
        <Text color="helper">Endpoint</Text>
        <Spacer y={0.1} />
        <IdContainer>
          <Text size={10} truncate>
            <Code>{endpoint}</Code>
          </Text>
          <CopyContainer>
            <CopyToClipboard text={endpoint}>
              <CopyIcon src={copy} alt="copy" />
            </CopyToClipboard>
          </CopyContainer>
        </IdContainer>
      </Row>
    ))
    .exhaustive();
};

const Code = styled.span`
  font-family: monospace;
`;

const IdContainer = styled.div`
  background: #26292e;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  width: 100%px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.border};
  align-items: center;
  user-select: text;
  text-overflow: ellipsis;
`;

const CopyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const CopyIcon = styled.img`
  cursor: pointer;
  margin-left: 5px;
  margin-right: 5px;
  width: 15px;
  height: 15px;
  :hover {
    opacity: 0.8;
  }
`;
