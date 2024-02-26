import React, { useCallback, useContext, useMemo, useState } from "react";
import axios from "axios";
import { useHistory } from "react-router";
import { z } from "zod";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import { Error as ErrorComponent } from "components/porter/Error";
import Icon from "components/porter/Icon";
import Input from "components/porter/Input";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useIntercom } from "lib/hooks/useIntercom";

import { Context } from "shared/Context";
import trash from "assets/trash.png";

import { useClusterContext } from "../ClusterContextProvider";
import { useClusterFormContext } from "../ClusterFormContextProvider";

const Settings: React.FC = () => {
  const { cluster, deleteCluster, updateClusterVanityName, isClusterUpdating } =
    useClusterContext();
  const [clusterName, setClusterName] = useState(cluster.vanity_name);
  const history = useHistory();
  const { setCurrentOverlay = () => ({}) } = useContext(Context);
  const { showIntercomWithMessage } = useIntercom();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [status, setStatus] = useState("");
  const { updateClusterButtonProps } = useClusterFormContext();

  const renameCluster = useCallback(async (): Promise<void> => {
    setStatus("loading");
    try {
      updateClusterVanityName(clusterName);
      setStatus("success");
    } catch (err) {
      setStatus("error");
    }
  }, [clusterName, updateClusterVanityName]);

  const handleDeletionSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      await deleteCluster();
      history.push("/infrastructure");
    } catch (err) {
      showIntercomWithMessage({
        message: "I am running into an issue deleting my cluster.",
      });

      let message =
        "Cluster deletion failed: please try again or contact support@porter.run if the error persists.";

      if (axios.isAxiosError(err)) {
        const parsed = z
          .object({ error: z.string() })
          .safeParse(err.response?.data);
        if (parsed.success) {
          message = `Cluster deletion failed: ${parsed.data.error}`;
        }
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
      setCurrentOverlay(null);
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

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }
    if (errorMessage) {
      return <ErrorComponent message={errorMessage} maxWidth="600px" />;
    }

    return "";
  }, [isSubmitting, errorMessage]);

  return (
    <Container>
      <Text size={16}>Cluster name</Text>
      <Spacer y={0.5} />
      <Text color={"helper"}>
        The vanity name for your cluster will not change your cluster&apos;s
        name in your cloud provider.
      </Text>
      <Spacer y={0.7} />
      <Input
        placeholder="ex: my-cluster"
        width="300px"
        value={clusterName}
        setValue={setClusterName}
      />
      <Spacer y={1} />
      <Button
        status={status}
        onClick={renameCluster}
        disabled={clusterName === ""}
      >
        Update
      </Button>
      <Spacer y={1} />
      <Text size={16}>Delete &quot;{cluster.vanity_name}&quot;</Text>
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
      <Spacer y={1} />
      <Button
        color="#b91133"
        onClick={handleDeletionClick}
        status={buttonStatus}
        disabled={
          isSubmitting ||
          updateClusterButtonProps.isDisabled ||
          isClusterUpdating
        }
        disabledTooltipMessage={
          isSubmitting
            ? "Deleting..."
            : "Unable to delete while the cluster is updating."
        }
      >
        <Icon src={trash} height={"15px"} />
        <Spacer inline x={0.5} />
        Delete
      </Button>
    </Container>
  );
};

export default Settings;
