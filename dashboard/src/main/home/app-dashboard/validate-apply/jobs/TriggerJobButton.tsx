import React, { useState } from "react";
import { useHistory } from "react-router";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Error from "components/porter/Error";

import Spacer from "components/porter/Spacer";
import { useIntercom } from "lib/hooks/useIntercom";
import api from "shared/api";
import {z} from "zod";
import target from "assets/target.svg";
import Icon from "components/porter/Icon";

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

  const triggerJobRun = async (): Promise<void> => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const resp = await api.appRun(
          "<token>",
          {
            deployment_target_id: deploymentTargetId,
            service_name: jobName,
          },
          {
            project_id: projectId,
            cluster_id: clusterId,
            porter_app_name: appName,
          })

      const parsed = await z.object({job_run_id: z.string()}).parseAsync(resp.data)

      const jobRunID = parsed.job_run_id
      history.push(
          `/apps/${appName}/job-history?job_run_id=${jobRunID}&service=${jobName}`
      );
    } catch {
      setStatus("");
      setErrorMessage("Unable to run job");
      showIntercomWithMessage({
        message: "I am running into an issue running my job.",
      });
    }
  };

  return (
    <Container row>
      <Button
        onClick={triggerJobRun}
        loadingText={"Running..."}
        status={status}
        height={"33px"}
      >
        <Icon src={target} height={"15px"}/>
        <Spacer inline x={.5}/>
        Run once
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
