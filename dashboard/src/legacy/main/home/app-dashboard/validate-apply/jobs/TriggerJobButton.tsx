import React, { useState } from "react";
import { useHistory } from "react-router";
import { z } from "zod";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Error from "components/porter/Error";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import { useIntercom } from "lib/hooks/useIntercom";

import api from "shared/api";
import target from "assets/target.svg";

import { useLatestRevision } from "../../app-view/LatestRevisionContext";

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
  const { deploymentTarget } = useLatestRevision();

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
        }
      );

      const parsed = await z
        .object({ job_run_id: z.string(), job_run_name: z.string() })
        .parseAsync(resp.data);

      const jobRunName = parsed.job_run_name;
      const route = deploymentTarget.is_preview
        ? `/preview-environments/apps/${appName}/job-history?job_run_name=${jobRunName}&service=${jobName}&target=${deploymentTargetId}`
        : `/apps/${appName}/job-history?job_run_name=${jobRunName}&service=${jobName}`;
      history.push(route);
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
        <Icon src={target} height={"15px"} />
        <Spacer inline x={0.5} />
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
