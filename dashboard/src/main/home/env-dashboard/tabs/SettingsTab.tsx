import React, { useContext, useState } from "react";
import { useHistory } from "react-router";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import loading from "assets/loading.gif";

import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Image from "components/porter/Image";

type Props = {
  envGroup: {
    name: string;
    type: string;
  }
};

const SettingsTab: React.FC<Props> = ({ envGroup }) => {
  const { currentProject, currentCluster, setCurrentOverlay } = useContext(Context);
  const history = useHistory();

  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const deleteEnvGroup = async (): Promise<void> => {
    try {
      await api.deleteNewEnvGroup(
        "<token>",
        {
          name: envGroup.name,
          type: envGroup.type
        },
        {
          id: currentProject?.id ?? -1,
          cluster_id: currentCluster?.id ?? -1
        },
      );
    } catch (error) {
    }
  };
  
  const handleDeletionSubmit = async (): Promise<void> => {
    setIsDeleting(true);
    if (setCurrentOverlay == null) {
      return;
    }

    try {
      await deleteEnvGroup();
      setCurrentOverlay(null);
      history.push("/envs");
    } catch (error) {
      setIsDeleting(false);
      console.log(error)
    }
  };

  const handleDeletionClick = async (): Promise<void> => {
    if (setCurrentOverlay === undefined) {
      return;
    }
    setCurrentOverlay({
      message: `Are you sure you want to delete ${envGroup.name}?`,
      onYes: handleDeletionSubmit,
      onNo: () => {
        setCurrentOverlay(null);
      },
    });
  };

  return (
    <StyledTemplateComponent>
      {isDeleting && (
        <>
          <Container row>
            <Image src={loading} size={15} />
            <Spacer inline x={1} />
            <Text size={16}>Deleting {envGroup.name}</Text>
          </Container>
          <Spacer y={0.5} />
          <Text color="helper">Please wait while we delete this datastore.</Text>
        </>
      )}
      {!isDeleting && (
        <>
          <Text size={16}>Delete {envGroup.name}</Text>
          <Spacer y={1} />
          <Text color="helper">
            Delete this datastore and all of its resources.
          </Text>
          <Spacer y={1.2} />
          <Button color="#b91133" onClick={handleDeletionClick}>
            Delete {envGroup.name}
          </Button>
        </>
      )}
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