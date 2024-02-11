import React, { useContext } from "react";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { Context } from "shared/Context";
import trash from "assets/trash.png";

import { useClusterContext } from "../ClusterContextProvider";

const Settings: React.FC = () => {
  const { cluster } = useClusterContext();
  const { setCurrentOverlay = () => ({}) } = useContext(Context);
  const handleDeletionSubmit = async (): Promise<void> => {
    try {
      //   await deleteDatastore(datastore.name);
      setCurrentOverlay(null);
    } catch (error) {
      // todo: handle error
    }
  };

  const handleDeletionClick = async (): Promise<void> => {
    setCurrentOverlay({
      message: `Are you sure you want to delete ${cluster.name}?`,
      onYes: handleDeletionSubmit,
      onNo: () => {
        setCurrentOverlay(null);
      },
    });
  };

  return (
    <Container style={{ width: "600px" }}>
      <Text size={16}>Delete &quot;{cluster.name}&quot;</Text>
      <Spacer y={0.5} />
      <Text color={"helper"}>
        Delete this cluster and underlying infrastructure. To ensure that
        everything has been properly destroyed, please visit the console of your
        cloud provider. Instructions to properly delete all resources can be
        found
        <a
          target="none"
          href="https://docs.porter.run/other/deleting-dangling-resources"
        >
          {" "}
          here
        </a>
        . Contact support@porter.run if you need guidance.
      </Text>
      <Spacer y={0.5} />
      <Button color="#b91133" onClick={handleDeletionClick}>
        <Icon src={trash} height={"15px"} />
        <Spacer inline x={0.5} />
        Delete
      </Button>
    </Container>
  );
};

export default Settings;
