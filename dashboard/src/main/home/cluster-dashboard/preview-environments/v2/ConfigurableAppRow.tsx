import React, { useMemo } from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import styled from "styled-components";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { AppIcon, AppSource } from "main/home/app-dashboard/apps/AppMeta";
import { type AppRevisionWithSource } from "main/home/app-dashboard/apps/types";

import settings from "assets/settings.svg";

type Props = {
  app: AppRevisionWithSource;
  setEditingApp: () => void;
};

export const ConfigurableAppRow: React.FC<Props> = ({ app, setEditingApp }) => {
  const proto = useMemo(() => {
    return PorterApp.fromJsonString(atob(app.app_revision.b64_app_proto), {
      ignoreUnknownFields: true,
    });
  }, [app.app_revision.b64_app_proto]);

  return (
    <Row>
      <div>
        <Container row>
          <Spacer inline width="1px" />
          <AppIcon buildpacks={proto.build?.buildpacks ?? []} />
          <Spacer inline width="12px" />
          <Text size={14}>{proto.name}</Text>
          <Spacer inline x={1} />
        </Container>
        <Spacer height="15px" />
        <Container row>
          <AppSource source={app.source} />
          <Spacer inline x={1} />
        </Container>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <SettingsButton
          onClick={() => {
            setEditingApp();
          }}
        >
          <img src={settings} />
          <Spacer inline x={0.5} />
          Update Previews
        </SettingsButton>
      </div>
    </Row>
  );
};

const SettingsButton = styled.button`
  background: ${(props) => props.theme.fg};
  padding: 8px 12px;
  border-radius: 5px;
  border: 1px solid #494b4f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    filter: brightness(120%);
  }
`;

const Row = styled.div<{ isAtBottom?: boolean }>`
  padding: 15px;
  border-bottom: ${(props) =>
    props.isAtBottom ? "none" : "1px solid #494b4f"};
  background: ${(props) => props.theme.clickable.bg};
  position: relative;
  border: 1px solid #494b4f;
  border-radius: 5px;
  margin-bottom: 15px;
  animation: fadeIn 0.3s 0s;
  display: flex;
  justify-content: space-between;
`;
