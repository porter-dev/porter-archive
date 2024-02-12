import React, { useContext, useMemo, useState } from "react";
import axios from "axios";
import { useHistory } from "react-router";
import { z } from "zod";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import { Error as ErrorComponent } from "components/porter/Error";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useIntercom } from "lib/hooks/useIntercom";

import { Context } from "shared/Context";
import trash from "assets/trash.png";

import { useClusterContext } from "../ClusterContextProvider";

const Settings: React.FC = () => {
  const { cluster, deleteCluster } = useClusterContext();
  const history = useHistory();
  const { setCurrentOverlay = () => ({}) } = useContext(Context);
  const { showIntercomWithMessage } = useIntercom();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDeletionSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      await deleteCluster();
      setCurrentOverlay(null);
      history.push("/infrastructure");
    } catch (err) {
      showIntercomWithMessage({
        message: "I am running into an issue updating my cluster.",
      });

      let message =
        "Cluster update failed: please try again or contact support@porter.run if the error persists.";

      if (axios.isAxiosError(err)) {
        const parsed = z
          .object({ error: z.string() })
          .safeParse(err.response?.data);
        if (parsed.success) {
          message = `Cluster update failed: ${parsed.data.error}`;
        }
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
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
      <Button
        color="#b91133"
        onClick={handleDeletionClick}
        status={buttonStatus}
        disabled={isSubmitting}
      >
        <Icon src={trash} height={"15px"} />
        <Spacer inline x={0.5} />
        Delete
      </Button>
    </Container>
  );
};

export default Settings;
