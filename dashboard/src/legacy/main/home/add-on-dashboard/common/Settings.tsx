import React, { useContext, useMemo, useState } from "react";
import trash from "legacy/assets/trash.png";
import Button from "legacy/components/porter/Button";
import Container from "legacy/components/porter/Container";
import { Error as ErrorComponent } from "legacy/components/porter/Error";
import Icon from "legacy/components/porter/Icon";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { useAddon } from "legacy/lib/hooks/useAddon";
import { getErrorMessageFromNetworkCall } from "legacy/lib/hooks/useCluster";
import { useIntercom } from "legacy/lib/hooks/useIntercom";
import { useHistory } from "react-router";

import { Code } from "main/home/managed-addons/tabs/shared";

import { Context } from "shared/Context";

import { useAddonContext } from "../AddonContextProvider";
import { useAddonFormContext } from "../AddonFormContextProvider";

const Settings: React.FC = () => {
  const { deleteAddon } = useAddon();
  const { addon, projectId, deploymentTarget } = useAddonContext();
  const { updateAddonButtonProps } = useAddonFormContext();
  const history = useHistory();
  const { setCurrentOverlay = () => ({}) } = useContext(Context);
  const { showIntercomWithMessage } = useIntercom();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDeletionSubmit = async (): Promise<void> => {
    try {
      setCurrentOverlay(null);
      setIsDeleting(true);
      await deleteAddon({
        projectId,
        deploymentTargetId: deploymentTarget.id,
        addon,
      });
      history.push("/addons");
    } catch (err) {
      showIntercomWithMessage({
        message: "I am running into an issue deleting my addon.",
      });
      setErrorMessage(getErrorMessageFromNetworkCall(err, "Addon deletion"));
    } finally {
      setIsDeleting(false);
      setCurrentOverlay(null);
    }
  };

  const handleDeletionClick = (): void => {
    setCurrentOverlay({
      message: `Are you sure you want to delete ${addon.name.value}?`,
      onYes: handleDeletionSubmit,
      onNo: () => {
        setCurrentOverlay(null);
      },
    });
  };

  const buttonStatus = useMemo(() => {
    if (isDeleting) {
      return "loading";
    }
    if (errorMessage) {
      return <ErrorComponent message={errorMessage} maxWidth="600px" />;
    }

    return "";
  }, [isDeleting, errorMessage]);

  return (
    <Container>
      <Text size={16}>
        Delete <Code>{addon.name.value}</Code>
      </Text>
      <Spacer y={0.5} />
      <Button
        color="#b91133"
        onClick={handleDeletionClick}
        status={buttonStatus}
        disabled={isDeleting || updateAddonButtonProps.isDisabled}
        loadingText={"Deleting..."}
        disabledTooltipMessage={"Unable to delete while the addon is updating."}
      >
        <Icon src={trash} height={"15px"} />
        <Spacer inline x={0.5} />
        Delete
      </Button>
    </Container>
  );
};

export default Settings;
