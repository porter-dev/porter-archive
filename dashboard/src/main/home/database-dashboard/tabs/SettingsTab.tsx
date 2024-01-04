import React, { useContext } from "react";
import { useHistory, useLocation } from "react-router";
import styled from "styled-components";

import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";

import { CloudProviderDatastore } from "../types";

type Props = {
  item: CloudProviderDatastore
};

const SettingsTab: React.FC<Props> = ({ item }) => {
  const {
    setCurrentError,
    setCurrentOverlay,
  } = useContext(Context);
  const history = useHistory();
  const location = useLocation();
  const handleDeletionSubmit = async (): Promise<void> => {
    if (setCurrentOverlay === undefined || setCurrentError === undefined) {
      return;
    }

    setCurrentOverlay(null);
    try {
      await api.deleteDatastore(
        "<token>",
        {
          name: item.datastore.name,
          type: item.datastore.type,
        },
        {
          project_id: item.project_id,
          cloud_provider_name: item.cloud_provider_name,
          cloud_provider_id: item.cloud_provider_id,
        }
      );
    } catch (error) {
      setCurrentError("Couldn't uninstall database, please try again");
    }
    pushFiltered(
      {
        history,
        location,
      },
      `/databases`,
      []
    );
  };

  const handleDeletionClick = async (): Promise<void> => {
    if (setCurrentOverlay === undefined) {
      return;
    }

    setCurrentOverlay({
      message: `Are you sure you want to delete ${item.datastore.name}?`,
      onYes: handleDeletionSubmit,
      onNo: () => setCurrentOverlay(null),
    });
  }

  return (
    <StyledTemplateComponent>
      <InnerWrapper>
        <Text size={16}>Delete &quot;{item.datastore.name}&quot;</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Delete this database and all of its resources.
        </Text>
        <Spacer y={0.5} />
        <Button color="#b91133" onClick={handleDeletionClick}>
          Delete {item.datastore.name}
        </Button>
      </InnerWrapper>
    </StyledTemplateComponent>
  );
};

export default SettingsTab;

const StyledTemplateComponent = styled.div`
width: 100%;
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

const InnerWrapper = styled.div<{ full?: boolean }>`
  width: 100%;
  height: ${(props) => (props.full ? "100%" : "calc(100% - 65px)")};
  padding: 30px;
  padding-bottom: 15px;
  position: relative;
  overflow: auto;
  margin-bottom: 30px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
`;
