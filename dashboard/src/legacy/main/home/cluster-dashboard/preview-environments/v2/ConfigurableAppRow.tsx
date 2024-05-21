import React from "react";
import addOns from "legacy/assets/add-ons.svg";
import database from "legacy/assets/database.svg";
import Container from "legacy/components/porter/Container";
import Icon from "legacy/components/porter/Icon";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type Environment } from "legacy/lib/environments/types";
import pluralize from "pluralize";
import styled from "styled-components";

import { AppSource } from "main/home/app-dashboard/apps/AppMeta";

type Props = {
  env: Environment;
  setEditingApp: () => void;
};

export const ConfigurableAppRow: React.FC<Props> = ({ env, setEditingApp }) => {
  const firstApp = env.apps?.[0];

  if (!firstApp) {
    return null;
  }

  return (
    <Row
      onClick={() => {
        setEditingApp();
      }}
    >
      <Container row>
        <Spacer inline width="1px" />
        <Icon src={addOns} height="18px" />
        <Spacer inline width="12px" />
        <Text size={14}>{env.name}</Text>
        <Spacer inline x={1} />
      </Container>
      <Spacer height="15px" />
      <Container row>
        <AppSource
          source={{
            from: "app_contract",
            details: firstApp,
          }}
        />
        <Spacer inline x={1} />
        <Container row>
          <DBIcon opacity="0.6" src={database} />
          <Text truncate={true} size={13} color="#ffffff44">
            {`${env.addons.length > 0 ? env.addons.length : "No"} ${pluralize(
              "datastore",
              env.addons.length
            )} included`}
          </Text>
        </Container>
      </Container>
    </Row>
  );
};

export const Row = styled.div`
  cursor: pointer;
  padding: 15px;
  border-bottom: 1px solid #494b4f;
  background: ${(props) => props.theme.clickable.bg};
  position: relative;
  border: 1px solid #494b4f;
  border-radius: 5px;
  margin-bottom: 15px;

  transition: all 0.2s;

  :hover {
    border: 1px solid #7a7b80;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const DBIcon = styled.img<{ opacity?: string; height?: string }>`
  margin-left: 2px;
  height: ${(props) => props.height || "14px"};
  opacity: ${(props) => props.opacity || 1};
  filter: grayscale(100%);
  margin-right: 10px;
`;
