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
import Placeholder from "components/OldPlaceholder";
import { useWebsockets } from "shared/hooks/useWebsockets";
import ExpandedOperation from "./ExpandedOperation";

type Props = {
  infra: Infrastructure;
  setLatestOperation: (operation: Operation) => void;
  refreshInfra: () => void;
};

const DeployList: React.FunctionComponent<Props> = ({
  infra,
  setLatestOperation,
  refreshInfra,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [operationList, setOperationList] = useState<Operation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<Operation>(null);
  const { currentProject, setCurrentError } = useContext(Context);

  const refreshOperationList = () => {
    api
      .listOperations(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra.id,
        }
      )
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        setOperationList(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    refreshOperationList();
  }, [currentProject, infra, infra?.latest_operation?.id]);

  const { newWebsocket, openWebsocket, closeWebsocket } = useWebsockets();

  const parseOperationWebsocketEvent = (evt: MessageEvent) => {
    let { status } = JSON.parse(evt.data);

    // if the status is operation completed, mark that operation as completed
    if (status == "OPERATION_COMPLETED") {
      refreshOperationList();
    }
  };

  const setupOperationWebsocket = (websocketID: string) => {
    let apiPath = `/api/projects/${currentProject.id}/infras/${infra.id}/operations/${infra.latest_operation.id}/state`;

    const wsConfig = {
      onopen: () => {
        console.log(`connected to websocket:`, websocketID);
      },
      onmessage: parseOperationWebsocketEvent,
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
    if (!currentProject || !infra || !infra.latest_operation) {
      return;
    }

    // if the operation list is empty or does not match the latest infra operation, don't
    // open a websocket
    if (
      operationList.length == 0 ||
      infra.latest_operation.id !== operationList[0].id
    ) {
      return;
    }

    // if the latest_operation is in progress, open a websocket
    if (operationList[0].status === "starting") {
      const websocketID = operationList[0].id + "_state";

      setupOperationWebsocket(websocketID);

      return () => {
        closeWebsocket(websocketID);
      };
    }
  }, [currentProject, infra, operationList]);

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (operationList.length == 0) {
    return <Placeholder>No operations available</Placeholder>;
  }

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  const getOperationDescription = (
    type: OperationType,
    status: OperationStatus
  ): string => {
    switch (type) {
      case "retry_create":
      case "create":
        if (status == "starting") {
          return "Infrastructure creation in progress";
        } else if (status == "completed") {
          return "Infrastructure creation completed.";
        } else if (status == "errored") {
          return "This infrastructure encountered an error while creating.";
        }
      case "update":
        if (status == "starting") {
          return "Infrastructure update in progress";
        } else if (status == "completed") {
          return "Infrastructure update completed.";
        } else if (status == "errored") {
          return "This infrastructure encountered an error while updating.";
        }
      case "retry_delete":
      case "delete":
        if (status == "starting") {
          return "Infrastructure deletion in progress";
        } else if (status == "completed") {
          return "Infrastructure deletion completed.";
        } else if (status == "errored") {
          return "This infrastructure encountered an error while deleting.";
        }
    }
  };

  const backFromExpandedOperation = (operation?: Operation) => {
    if (operation) {
      setLatestOperation(operation);
    }

    setSelectedOperation(null);
  };

  const renderContents = () => {
    if (selectedOperation) {
      return (
        <ExpandedOperation
          operation_id={selectedOperation.id}
          infra={infra}
          back={backFromExpandedOperation}
          refreshInfra={refreshInfra}
        />
      );
    }

    return operationList.map((operation, i) => {
      return (
        <React.Fragment key={i}>
          <StyledCard
            status={operation.status}
            onClick={() => setSelectedOperation(operation)}
          >
            <ContentContainer>
              <Icon
                status={operation.status}
                className="material-icons-outlined"
              >
                {operation.status === "errored"
                  ? "report_problem"
                  : operation.status === "completed"
                  ? "check_circle"
                  : "cached"}
              </Icon>
              <DeployInformation>
                <DeployHeader>
                  {getOperationDescription(operation.type, operation.status)}
                </DeployHeader>
              </DeployInformation>
            </ContentContainer>
            <MetaContainer>
              <TimestampContainer>
                <TimestampIcon className="material-icons-outlined">
                  access_time
                </TimestampIcon>
                <span>{readableDate(operation.last_updated)}</span>
              </TimestampContainer>
            </MetaContainer>
            <NextIconContainer>
              <i className="material-icons next-icon">navigate_next</i>
            </NextIconContainer>
          </StyledCard>
        </React.Fragment>
      );
    });
  };

  return (
    <DatabasesListWrapper>
      <StyledDeploysGrid>{renderContents()}</StyledDeploysGrid>
    </DatabasesListWrapper>
  );
};

export default DeployList;

const DatabasesListWrapper = styled.div``;

const StyledDeploysGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const StyledCard = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid
    ${({ status }) => (status === "critical" ? "#ff385d" : "#ffffff44")};
  background: #ffffff08;
  margin-bottom: 3px;
  border-radius: 10px;
  padding: 14px;
  overflow: hidden;
  height: 60px;
  font-size: 13px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    border: 1px solid
      ${({ status }) => (status === "critical" ? "#ff385d" : "#ffffff66")};
  }
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .next-icon {
    display: none;
    color: #ffffff55;
  }

  :hover .next-icon {
    display: inline-block;
  }
`;

const NextIconContainer = styled.div`
  width: 30px;
  padding-top: 2px;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const Icon = styled.span<{ status: OperationStatus }>`
  font-size: 20px;
  margin-left: 10px;
  margin-right: 20px;
  color: ${({ status }) => (status === "errored" ? "#ff385d" : "#aaaabb")};
`;

const DeployInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const DeployHeader = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const MetaContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const TimestampContainer = styled.div`
  display: flex;
  white-space: nowrap;
  align-items: center;
  color: #ffffff55;
  margin-right: 10px;
  font-size: 13px;
  min-width: 130px;
  justify-content: space-between;
`;

const TimestampIcon = styled.span`
  margin-right: 7px;
  font-size: 18px;
`;
