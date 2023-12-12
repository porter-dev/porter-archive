import React, { useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHistory } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  appRevisionWithSourceValidator,
  type AppRevisionWithSource,
} from "main/home/app-dashboard/apps/types";

import api from "shared/api";
import { Context } from "shared/Context";

import { ConfigurableAppRow } from "./ConfigurableAppRow";
import { SetupPreviewAppModal } from "./setup-app/SetupAppModal";

export const ConfigurableAppList: React.FC = () => {
  const history = useHistory();
  const queryParams = new URLSearchParams(window.location.search);

  const { currentProject, currentCluster } = useContext(Context);
  const [editingApp, setEditingApp] = useState<AppRevisionWithSource | null>(
    null
  );

  const { data: apps = [], status } = useQuery(
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

  if (status === "loading") {
    return <Loading offset="-150px" />;
  }

  if (apps.length === 0) {
    return (
      <Fieldset>
        <CentralContainer>
          <Text size={16}>No apps have been deployed yet.</Text>
          <Spacer y={1} />

          <Text color={"helper"}>Get started by creating a new app.</Text>
          <Spacer y={1} />
          <Button
            onClick={() => {
              history.push("/apps/new/app");
            }}
          >
            Create App
          </Button>
        </CentralContainer>
      </Fieldset>
    );
  }

  return (
    <List>
      {apps.map((a) => (
        <ConfigurableAppRow
          key={a.source.id}
          setEditingApp={() => {
            queryParams.set("target", a.app_revision.deployment_target.id);
            history.push({
              pathname: "/preview-environments",
              search: queryParams.toString(),
            });
            setEditingApp(a);
          }}
          app={a}
        />
      ))}
      {editingApp && (
        <SetupPreviewAppModal
          app={editingApp}
          onClose={() => {
            setEditingApp(null);
          }}
        />
      )}
    </List>
  );
};

const CentralContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
`;

const List = styled.div`
  overflow: hidden;
`;
