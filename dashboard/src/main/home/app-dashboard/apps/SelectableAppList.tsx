import React, { useMemo } from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import styled, { css } from "styled-components";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { AppIcon, AppSource } from "main/home/app-dashboard/apps/AppMeta";

import healthy from "assets/status-healthy.png";

import { type AppRevisionWithSource } from "./types";

type SelectableAppRowProps = {
  app: AppRevisionWithSource;
  onSelect?: () => void;
  onDeselect?: () => void;
  selected?: boolean;
};

const SelectableAppRow: React.FC<SelectableAppRowProps> = ({
  app,
  selected,
  onSelect,
  onDeselect,
}) => {
  const proto = useMemo(() => {
    return PorterApp.fromJsonString(atob(app.app_revision.b64_app_proto), {
      ignoreUnknownFields: true,
    });
  }, [app.app_revision.b64_app_proto]);

  return (
    <ResourceOption
      selected={selected}
      onClick={() => {
        if (selected) {
          onDeselect?.();
        } else {
          onSelect?.();
        }
      }}
      isHoverable={onSelect != null || onDeselect != null}
    >
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
      {selected && <Icon height="18px" src={healthy} />}
    </ResourceOption>
  );
};

type AppListProps = {
  appListItems: Array<{
    app: AppRevisionWithSource;
    key: string;
    onSelect?: () => void;
    onDeselect?: () => void;
    isSelected?: boolean;
  }>;
};

const SelectableAppList: React.FC<AppListProps> = ({ appListItems }) => {
  return (
    <StyledSelectableAppList>
      {appListItems.map((ali) => {
        return (
          <SelectableAppRow
            key={ali.key}
            app={ali.app}
            selected={ali.isSelected}
            onSelect={ali.onSelect}
            onDeselect={ali.onDeselect}
          />
        );
      })}
    </StyledSelectableAppList>
  );
};

export default SelectableAppList;

const StyledSelectableAppList = styled.div`
  display: flex;
  row-gap: 10px;
  flex-direction: column;
  max-height: 400px;
  overflow-y: scroll;
`;

const ResourceOption = styled.div<{ selected?: boolean; isHoverable: boolean }>`
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid
    ${(props) => (props.selected ? "#ffffff" : props.theme.border)};
  width: 100%;
  padding: 10px 15px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  ${(props) => props.isHoverable && "cursor: pointer;"}
  ${(props) =>
    props.isHoverable &&
    !props.selected &&
    css`
      &:hover {
        border: 1px solid #7a7b80;
      }
    `}
`;
