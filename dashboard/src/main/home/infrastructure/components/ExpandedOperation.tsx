import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import {
  Infrastructure,
  Operation,
  OperationStatus,
  OperationType,
} from "shared/types";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";
import { useWebsockets } from "shared/hooks/useWebsockets";
import Heading from "components/form-components/Heading";
import SaveButton from "components/SaveButton";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import Description from "components/Description";
import { OperationDetails } from "components/ProvisionerStatus";

type Props = {
  infra: Infrastructure;
  operation_id: string;
  back: (operation?: Operation) => void;
  refreshInfra: () => void;
};

const ExpandedOperation: React.FunctionComponent<Props> = ({
  infra,
  operation_id,
  back,
  refreshInfra,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [operation, setOperation] = useState<Operation>(null);
  const [logs, setLogs] = useState<string[]>(null);
  const { currentProject, setCurrentError } = useContext(Context);

  const { newWebsocket, openWebsocket, closeWebsocket } = useWebsockets();

  useEffect(() => {
    api
      .getOperation(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra.id,
          operation_id: operation_id,
        }
      )
      .then(({ data }) => {
        setOperation(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });
  }, [currentProject, operation_id]);

  const parseLogWebsocketEvent = (evt: MessageEvent) => {
    setLogs((logs) => {
      if (!logs) {
        return [evt.data];
      }

      let newLogs = [...logs];
      newLogs.push(evt.data);
      return newLogs;
    });
  };

  const setupLogWebsocket = (websocketID: string) => {
    let apiPath = `/api/projects/${currentProject.id}/infras/${operation.infra_id}/operations/${operation.id}/log_stream`;

    const wsConfig = {
      onopen: () => {
        console.log(`connected to websocket:`, websocketID);
      },
      onmessage: parseLogWebsocketEvent,
      onclose: () => {
        console.log(`closing websocket:`, websocketID);
      },
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(websocketID);
      },
    };

    newWebsocket(websocketID, apiPath, wsConfig);
    openWebsocket(websocketID);
  };

  useEffect(() => {
    if (!currentProject || !operation) {
      return;
    }

    // if the operation is in progress, open a websocket
    if (operation.status === "starting") {
      const websocketID = operation.id + "_log_stream";

      setupLogWebsocket(websocketID);

      return () => {
        closeWebsocket(websocketID);
      };
    } else {
      // if the operation is completed, get logs from the endpoint
      api
        .getOperationLogs(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            infra_id: infra.id,
            operation_id: operation_id,
          }
        )
        .then(({ data }) => {
          if (!Array.isArray(data.logs)) {
            throw Error("Data is not an array");
          }

          setLogs(data.logs);
        })
        .catch(() => {
          setLogs(["No logs available."]);
        });
    }
  }, [currentProject, operation]);

  const retry = () => {
    let pathParams = {
      project_id: currentProject.id,
      infra_id: infra.id,
    };

    let apiCall = api.updateInfra;

    if (operation.type == "create" || operation.type == "retry_create") {
      apiCall = api.retryCreateInfra;
    } else if (operation.type == "delete" || operation.type == "retry_delete") {
      apiCall = api.retryDeleteInfra;
    }

    apiCall("<token>", {}, pathParams)
      .then(({ data }) => {
        back(data);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
      });
  };

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  const getOperationDescription = (
    type: OperationType,
    status: OperationStatus,
    time: string
  ): string => {
    switch (type) {
      case "retry_create":
      case "create":
        if (status == "starting") {
          return (
            "Infrastructure creation in progress, started at " +
            readableDate(time)
          );
        } else if (status == "completed") {
          return "Infrastructure creation completed at " + readableDate(time);
        } else if (status == "errored") {
          return "This infrastructure encountered an error while creating.";
        }
      case "update":
        if (status == "starting") {
          return (
            "Infrastructure update in progress, started at " +
            readableDate(time)
          );
        } else if (status == "completed") {
          return "Infrastructure update completed at " + readableDate(time);
        } else if (status == "errored") {
          return "This infrastructure encountered an error while updating.";
        }
      case "retry_delete":
      case "delete":
        if (status == "starting") {
          return (
            "Infrastructure deletion in progress, started at " +
            readableDate(time)
          );
        } else if (status == "completed") {
          return "Infrastructure deletion completed at " + readableDate(time);
        } else if (status == "errored") {
          return "This infrastructure encountered an error while deleting.";
        }
    }
  };

  const renderRerunButton = () => {
    let buttonText = "Retry Operation";

    if (operation.type == "create" || operation.type == "retry_create") {
      buttonText = "Retry Creation";
    } else if (operation.type == "delete" || operation.type == "retry_delete") {
      buttonText = "Retry Deletion";
    } else if (operation.type == "update") {
      buttonText = "Retry";
    }
    return (
      <SaveButton
        onClick={retry}
        text={buttonText}
        disabled={false}
        makeFlush={true}
        clearPosition={true}
      />
    );
  };

  const renderLogs = () => {
    if (!logs) {
      return (
        <Placeholder>
          <Loading />
        </Placeholder>
      );
    }

    return logs.map((l, i) => <Log key={i}>{l}</Log>);
  };

  const renderOperationDetails = () => {
    if (infra.latest_operation.id == operation.id) {
      return (
        <>
          <Description>Infrastructure progress:</Description>
          <OperationDetails
            infra={infra}
            refreshInfra={refreshInfra}
            useOperation={operation}
            padding={"12px 0"}
          />
        </>
      );
    }

    return (
      <>
        <Description>
          {getOperationDescription(
            operation.type,
            operation.status,
            operation.last_updated
          )}
        </Description>
        <Br />
      </>
    );
  };

  return (
    <StyledCard>
      <BackArrowContainer>
        <BackArrow onClick={() => back()}>
          <i className="material-icons next-icon">navigate_before</i>
          All Deploys
        </BackArrow>
      </BackArrowContainer>
      <MetadataContainer>
        <Heading>Deployment Summary</Heading>
        {renderOperationDetails()}
        {renderRerunButton()}
      </MetadataContainer>
      <MetadataContainer>
        <Heading>Configuration</Heading>
        <Description>
          Your infrastructure was deployed with the following configuration:
        </Description>
        <PorterFormContainer>
          <PorterFormWrapper
            showStateDebugger={false}
            formData={operation.form}
            valuesToOverride={{}}
            isReadOnly={true}
            color="#f5cb42"
            isInModal={false}
            hideBottomSpacer={false}
          />
        </PorterFormContainer>
      </MetadataContainer>
      <LogSectionContainer>
        <LogTitleContainer>
          <Heading>Deployment Logs</Heading>
          <Description>
            The following are the Terraform logs from your deployment:
          </Description>
        </LogTitleContainer>
        <LogContainer>{renderLogs()}</LogContainer>
      </LogSectionContainer>
    </StyledCard>
  );
};

export default ExpandedOperation;

const PorterFormContainer = styled.div`
  position: relative;
  min-width: 300px;
`;

const Br = styled.div`
  width: 100%;
  height: 20px;
`;

const StyledCard = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const BackArrowContainer = styled.div`
  width: 100%;
  height: 24px;
`;

const BackArrow = styled.div`
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 6px;
  }

  color: #aaaabb;
  display: flex;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
  width: 120px;
`;

const MetadataContainer = styled.div`
  margin-bottom: 3px;
  border-radius: 6px;
  background: #2e3135;
  padding: 0 20px 16px 20px;
  overflow-y: auto;
  min-height: 180px;
  font-size: 13px;
`;

const LogTitleContainer = styled.div`
  padding: 0 20px;
  margin-bottom: 20px;
`;

const LogSectionContainer = styled.div`
  margin-bottom: 3px;
  border-radius: 6px;
  background: #2e3135;
  overflow: hidden;
  max-height: 500px;
  font-size: 13px;
`;

const LogContainer = styled.div`
  padding: 14px;
  font-size: 13px;
  background: #121318;
  user-select: text;
  overflow-wrap: break-word;
  overflow-y: auto;
  min-height: 55px;
  color: #aaaabb;
  height: 400px;
`;

const Log = styled.div`
  font-family: monospace, sans-serif;
  font-size: 12px;
  color: white;
`;
