import React, { useContext, useState } from "react";
import loading from "legacy/assets/loading.gif";
import Button from "legacy/components/porter/Button";
import Container from "legacy/components/porter/Container";
import Error from "legacy/components/porter/Error";
import Image from "legacy/components/porter/Image";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import api from "legacy/shared/api";
import { envGroupPath } from "legacy/shared/util";
import { useHistory } from "react-router";
import styled from "styled-components";

import { Context } from "shared/Context";

type Props = {
  envGroup: {
    name: string;
    type: string;
    linked_applications: string[];
  };
};

const SettingsTab: React.FC<Props> = ({ envGroup }) => {
  const { currentProject, currentCluster, setCurrentOverlay } =
    useContext(Context);
  const history = useHistory();

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [buttonStatus, setButtonStatus] = useState<React.ReactNode>("");

  const deleteEnvGroup = async (): Promise<void> => {
    try {
      await api.deleteNewEnvGroup(
        "<token>",
        {
          name: envGroup.name,
          type: envGroup.type,
        },
        {
          id: currentProject?.id ?? -1,
          cluster_id: currentCluster?.id ?? -1,
        }
      );
    } catch (error) {}
  };

  const handleDeletionSubmit = async (): Promise<void> => {
    if (envGroup?.linked_applications.length) {
      setButtonStatus(
        <Error message="Remove this env group from all synced applications to delete." />
      );
      setCurrentOverlay && setCurrentOverlay(null);
      return;
    }
    setIsDeleting(true);
    if (setCurrentOverlay == null) {
      return;
    }

    try {
      setCurrentOverlay(null);
      await deleteEnvGroup();
      history.push(envGroupPath(currentProject, ""));
    } catch (error) {
      setIsDeleting(false);
      setButtonStatus(<Error message="Env group deletion failed" />);
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
          <Text color="helper">
            Please wait while we delete this env group.
          </Text>
        </>
      )}
      {!isDeleting && (
        <>
          <Text size={16}>Delete {envGroup.name}</Text>
          <Spacer y={1} />
          <Text color="helper">
            Delete this environment group including all secrets and
            environment-specific configuration.
          </Text>
          <Spacer y={1.2} />
          <Button
            color="#b91133"
            onClick={handleDeletionClick}
            status={buttonStatus}
            disabled={envGroup.type === "datastore"}
            disabledTooltipMessage={
              "This environment group is managed by a datastore. You cannot delete it."
            }
          >
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
