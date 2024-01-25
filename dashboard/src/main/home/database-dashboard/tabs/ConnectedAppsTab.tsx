import React, { useContext, useMemo, useState } from "react";
import _ from "lodash";
import { useHistory } from "react-router";
import styled from "styled-components";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SelectableAppList from "main/home/app-dashboard/apps/SelectableAppList";
import { useDatastoreMethods } from "lib/hooks/useDatabaseMethods";
import { useLatestAppRevisions } from "lib/hooks/useLatestAppRevisions";

import { Context } from "shared/Context";

import { useDatastoreContext } from "../DatabaseContextProvider";
import ConnectAppsModal from "../shared/ConnectAppsModal";

const ConnectedAppsTab: React.FC = () => {
  const [showConnectAppsModal, setShowConnectAppsModal] = useState(false);
  const { projectId, datastore } = useDatastoreContext();
  // NB: the cluster id here is coming from the global context, but really it should be coming from
  // the datastore context. However, we do not currently have a way to relate db to the cluster it lives in.
  // This will be a bug for multi-cluster projects.
  const { currentCluster: { id: clusterId = 0 } = {} } = useContext(Context);
  const { revisions } = useLatestAppRevisions({
    projectId,
    clusterId,
  });
  const { attachDatastoreToAppInstances } = useDatastoreMethods();
  const history = useHistory();

  const { connectedApps, remainingApps } = useMemo(() => {
    const [connected, remaining] = _.partition(
      revisions,
      (r) => datastore.env?.linked_applications.includes(r.source.name)
    );
    return {
      connectedApps: connected.sort((a, b) =>
        a.source.name.localeCompare(b.source.name)
      ),
      remainingApps: remaining.sort((a, b) =>
        a.source.name.localeCompare(b.source.name)
      ),
    };
  }, [revisions, datastore.env?.linked_applications]);

  return (
    <ConnectedAppsContainer>
      <Container row>
        <Text size={16}>Connected Apps</Text>
      </Container>
      <SelectableAppList
        appListItems={connectedApps.map((ra) => ({
          app: ra,
          key: ra.source.name,
          onSelect: () => {
            history.push(
              `/apps/${ra.source.name}?target=${ra.app_revision.deployment_target.id}`
            );
          },
        }))}
      />
      <Spacer y={0.5} />
      <AddAddonButton
        onClick={() => {
          setShowConnectAppsModal(true);
        }}
      >
        <I className="material-icons add-icon">add</I>
        Connect apps to this datastore
      </AddAddonButton>
      {showConnectAppsModal && (
        <ConnectAppsModal
          closeModal={() => {
            setShowConnectAppsModal(false);
          }}
          apps={remainingApps}
          onSubmit={async (appInstanceIds: string[]) => {
            await attachDatastoreToAppInstances({
              name: datastore.name,
              clusterId,
              appInstanceIds,
            });
          }}
        />
      )}
    </ConnectedAppsContainer>
  );
};

export default ConnectedAppsTab;

const ConnectedAppsContainer = styled.div`
  width: 100%;
`;

const AddAddonButton = styled.div`
  color: #aaaabb;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  align-items: center;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  .add-icon {
    width: 30px;
    font-size: 20px;
  }
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 7px;
  justify-content: center;
`;
