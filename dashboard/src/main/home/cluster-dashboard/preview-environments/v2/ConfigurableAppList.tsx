import React, { useContext } from "react";
import { useHistory } from "react-router";
import styled from "styled-components";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useLatestAppRevisions } from "lib/hooks/useLatestAppRevisions";

import { Context } from "shared/Context";

import { ConfigurableAppRow } from "./ConfigurableAppRow";

export const ConfigurableAppList: React.FC = () => {
  const history = useHistory();
  const queryParams = new URLSearchParams(window.location.search);

  const { currentProject, currentCluster } = useContext(Context);

  const { revisions: apps } = useLatestAppRevisions({
    projectId: currentProject?.id ?? 0,
    clusterId: currentCluster?.id ?? 0,
  });

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
            queryParams.set("app_name", a.source.name);
            history.push({
              pathname: "/preview-environments/configure",
              search: queryParams.toString(),
            });
          }}
          app={a}
        />
      ))}
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
