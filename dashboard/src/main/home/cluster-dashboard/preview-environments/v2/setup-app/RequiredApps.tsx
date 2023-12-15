import React, { useContext, useMemo } from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import {
  useFieldArray,
  useFormContext,
  type UseFieldArrayAppend,
} from "react-hook-form";
import styled from "styled-components";
import { z } from "zod";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ButtonStatus } from "main/home/app-dashboard/app-view/AppDataContainer";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { AppIcon, AppSource } from "main/home/app-dashboard/apps/AppMeta";
import {
  appRevisionWithSourceValidator,
  type AppRevisionWithSource,
} from "main/home/app-dashboard/apps/types";
import { type PorterAppFormData } from "lib/porter-apps";

import api from "shared/api";
import { Context } from "shared/Context";
import healthy from "assets/status-healthy.png";

type RowProps = {
  idx: number;
  app: AppRevisionWithSource;
  append: UseFieldArrayAppend<PorterAppFormData, "app.requiredApps">;
  remove: (index: number) => void;
  selected?: boolean;
};

const RequiredAppRow: React.FC<RowProps> = ({
  idx,
  app,
  selected,
  append,
  remove,
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
          remove(idx);
        } else {
          append({ name: app.source.name });
        }
      }}
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

type Props = {
  buttonStatus: ButtonStatus;
};

export const RequiredApps: React.FC<Props> = ({ buttonStatus }) => {
  const { currentCluster, currentProject } = useContext(Context);

  const {
    control,
    formState: { isSubmitting },
  } = useFormContext<PorterAppFormData>();
  const { append, remove, fields } = useFieldArray({
    control,
    name: "app.requiredApps",
  });

  const { porterApp } = useLatestRevision();

  const { data: apps = [] } = useQuery(
    [
      "getLatestAppRevisions",
      {
        cluster_id: currentCluster?.id,
        project_id: currentProject?.id,
      },
    ],
    async () => {
      if (
        !currentCluster ||
        !currentProject ||
        currentCluster.id === -1 ||
        currentProject.id === -1
      ) {
        return;
      }

      const res = await api.getLatestAppRevisions(
        "<token>",
        {
          deployment_target_id: undefined,
          ignore_preview_apps: true,
        },
        { cluster_id: currentCluster.id, project_id: currentProject.id }
      );

      const apps = await z
        .object({
          app_revisions: z.array(appRevisionWithSourceValidator),
        })
        .parseAsync(res.data);

      return apps.app_revisions;
    },
    {
      refetchOnWindowFocus: false,
      enabled: !!currentCluster && !!currentProject,
    }
  );

  const remainingApps = useMemo(() => {
    return apps.filter((a) => a.source.name !== porterApp.name);
  }, [apps, porterApp, fields.length]);

  return (
    <div>
      <Text size={16}>Required Apps</Text>
      <Spacer y={0.5} />
      <RequiredAppList>
        {remainingApps.map((ra) => {
          const selectedAppIdx = fields.findIndex(
            (f) => f.name === ra.source.name
          );

          return (
            <RequiredAppRow
              idx={selectedAppIdx}
              key={
                selectedAppIdx !== -1
                  ? fields[selectedAppIdx].id
                  : ra.source.name
              }
              app={ra}
              append={append}
              remove={remove}
              selected={selectedAppIdx !== -1}
            />
          );
        })}
      </RequiredAppList>
      <Spacer y={0.75} />
      <Button
        type="submit"
        status={buttonStatus}
        loadingText={"Updating..."}
        disabled={isSubmitting}
      >
        Update app
      </Button>
    </div>
  );
};

const RequiredAppList = styled.div`
  display: flex;
  row-gap: 10px;
  flex-direction: column;
`;

const ResourceOption = styled.div<{ selected?: boolean }>`
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid
    ${(props) => (props.selected ? "#ffffff" : props.theme.border)};
  width: 100%;
  padding: 10px 15px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  :hover {
    border: 1px solid #ffffff;
  }
`;
