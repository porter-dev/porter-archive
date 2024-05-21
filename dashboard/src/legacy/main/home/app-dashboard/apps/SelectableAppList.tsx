import React, { useMemo } from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import healthy from "legacy/assets/status-healthy.png";
import Container from "legacy/components/porter/Container";
import SelectableList from "legacy/components/porter/SelectableList";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";

import { AppIcon, AppSource } from "main/home/app-dashboard/apps/AppMeta";

import { type AppRevisionWithSource } from "./types";

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
    <SelectableList
      selectedIcon={healthy}
      listItems={appListItems.map((ali) => {
        const proto = useMemo(() => {
          return PorterApp.fromJsonString(
            atob(ali.app.app_revision.b64_app_proto),
            {
              ignoreUnknownFields: true,
            }
          );
        }, [ali.app.app_revision.b64_app_proto]);
        return {
          selectable: (
            <>
              <Container row>
                <Spacer inline width="1px" />
                <AppIcon
                  buildpacks={proto.build?.buildpacks ?? []}
                  size="larger"
                />
                <Spacer inline width="12px" />
                <Text size={14}>{proto.name}</Text>
                <Spacer inline x={1} />
              </Container>
              <Spacer height="15px" />
              <Container row>
                <AppSource
                  source={{
                    from: "porter_apps",
                    details: ali.app.source,
                  }}
                />
                <Spacer inline x={1} />
              </Container>
            </>
          ),
          key: ali.key,
          onSelect: ali.onSelect,
          onDeselect: ali.onDeselect,
          isSelected: ali.isSelected,
        };
      })}
    />
  );
};

export default SelectableAppList;
