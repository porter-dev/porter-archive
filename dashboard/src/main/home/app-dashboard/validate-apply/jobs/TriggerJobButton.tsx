import React, { useState } from "react";
import { useHistory } from "react-router";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Error from "components/porter/Error";

import Spacer from "../../../../../components/porter/Spacer";
import { useIntercom } from "../../../../../lib/hooks/useIntercom";
import { runJob } from "./utils";

type Props = {
  projectId: number;
  clusterId: number;
  appName: string;
  jobName: string;
  deploymentTargetId: string;
};

const TriggerJobButton: React.FC<Props> = ({
  projectId,
  clusterId,
  appName,
  jobName,
  deploymentTargetId,
}) => {
  const history = useHistory();
  const { showIntercomWithMessage } = useIntercom();

  const [errorMessage, setErrorMessage] = useState("");
  const [status, setStatus] = useState("");

  const triggerJobRun = (): void => {
    setStatus("loading");
    setErrorMessage("");
    runJob(projectId, clusterId, deploymentTargetId, appName, jobName)
      .then((jobRunID) => {
        history.push(
          `/apps/${appName}/job-history?job_run_id=${jobRunID}&service=${jobName}`
        );
      })
      .catch(() => {
        setStatus("");
        setErrorMessage("Unable to run job");
        showIntercomWithMessage({
          message: "I am running into an issue running my job.",
        });
      });
  };

  return (
    <Container row>
      <Button
        onClick={triggerJobRun}
        loadingText={"Running..."}
        status={status}
      >
        Run job
      </Button>
      {errorMessage !== "" && (
        <>
          <Spacer x={1} inline /> <Error message={errorMessage} />
        </>
      )}
    </Container>
  );
};

export default TriggerJobButton;
