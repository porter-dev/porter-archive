import React, { useContext, useEffect, useRef, useState } from "react";
import { integrationList } from "shared/common";
import styled, { keyframes } from "styled-components";
import { readableDate } from "shared/string_utils";
import {
  Infrastructure,
  KindMap,
  Operation,
  OperationStatus,
  OperationType,
  TFResourceState,
  TFState,
} from "shared/types";
import api from "shared/api";
import Placeholder from "./Placeholder";
import Loading from "./Loading";
import { Context } from "shared/Context";
import { useWebsockets } from "shared/hooks/useWebsockets";
import Description from "./Description";

type Props = {
  infras: Infrastructure[];
  project_id: number;
  setInfraStatus: (infra: Infrastructure) => void;
  auto_expanded?: boolean;
  can_delete?: boolean;
  set_max_width?: boolean;
};

const nameMap: { [key: string]: string } = {
  eks: "Elastic Kubernetes Service (EKS)",
  ecr: "Elastic Container Registry (ECR)",
  doks: "DigitalOcean Kubernetes Service (DOKS)",
  docr: "DigitalOcean Container Registry (DOCR)",
  gke: "Google Kubernetes Engine (GKE)",
  gcr: "Google Container Registry (GCR)",
  rds: "Amazon Relational Database (RDS)",
};

const ProvisionerStatus: React.FC<Props> = ({
  infras,
  project_id,
  auto_expanded,
  set_max_width,
  can_delete,
  setInfraStatus,
}) => {
  const renderV1Infra = (infra: Infrastructure) => {
    return (
      <V1InfraObject
        key={infra.id}
        infra={infra}
        is_expanded={auto_expanded}
        is_collapsible={!auto_expanded}
        set_max_width={set_max_width}
      />
    );
  };

  const updateInfraStatus = (infra: Infrastructure) => {
    // in order for this to propagate to parent, we check that all tracked infras (including
    // the reported infra) are in a final state
    setInfraStatus(infra);
  };

  const renderV2Infra = (infra: Infrastructure) => {
    return (
      <V2InfraObject
        key={infra.id}
        project_id={project_id}
        infra={infra}
        is_expanded={auto_expanded}
        is_collapsible={!auto_expanded}
        set_max_width={set_max_width}
        can_delete={can_delete}
        updateInfraStatus={updateInfraStatus}
      />
    );
  };

  const renderInfras = () => {
    return infras.map((infra) => {
      if (infra.api_version == "v2") {
        return renderV2Infra(infra);
      }

      return renderV1Infra(infra);
    });
  };

  return <StyledProvisionerStatus>{renderInfras()}</StyledProvisionerStatus>;
};

export default ProvisionerStatus;

type V1InfraObjectProps = {
  infra: Infrastructure;
  is_expanded: boolean;
  is_collapsible: boolean;
  set_max_width?: boolean;
};

const V1InfraObject: React.FC<V1InfraObjectProps> = ({
  infra,
  is_expanded,
  is_collapsible,
  set_max_width,
}) => {
  const [isExpanded, setIsExpanded] = useState(is_expanded);

  const renderTimestampSection = () => {
    let timestampLabel = "Started at";

    switch (infra.status) {
      case "created":
        timestampLabel = "Created at";
        break;
      case "deleted":
      case "destroyed":
        timestampLabel = "Deleted at";
        break;
      case "errored":
        timestampLabel = "Errored at";
        break;
    }

    return (
      <Timestamp>
        {timestampLabel} {readableDate(infra.updated_at)}
      </Timestamp>
    );
  };

  const renderErrorSection = () => {
    let errors: string[] = [];
    if (infra.status == "destroyed" || infra.status == "deleted") {
      errors.push("This infrastructure was destroyed.");
    }
    if (errors.length > 0) {
      return (
        <>
          <Description>
            Encountered the following errors while provisioning:
          </Description>
          <ErrorWrapper>
            {errors.map((error, index) => {
              return <ExpandedError key={index}>{error}</ExpandedError>;
            })}
          </ErrorWrapper>
        </>
      );
    }
  };

  const renderExpandedContents = () => {
    if (isExpanded) {
      let errors: string[] = [];

      if (infra.status == "destroyed" || infra.status == "deleted") {
        errors.push("This infrastructure was destroyed.");
      }

      let error = null;

      if (errors.length > 0) {
        error = errors.map((error, index) => {
          return <ExpandedError key={index}>{error}</ExpandedError>;
        });
      }

      return (
        <StyledV1Card>
          <Description>
            Infrastructure is {infra.status}, last updated at{" "}
            {readableDate(infra.updated_at)}
          </Description>
          {renderErrorSection()}
        </StyledV1Card>
      );
    }
  };

  return (
    <StyledInfraObject key={infra.id} set_max_width={set_max_width}>
      <InfraHeader
        is_clickable={is_collapsible}
        onClick={() => {
          if (is_collapsible) {
            setIsExpanded((val) => {
              return !val;
            });
          }
        }}
      >
        <Flex>
          {integrationList[infra.kind] && (
            <Icon src={integrationList[infra.kind].icon} />
          )}
          {KindMap[infra.kind]?.provider_name}
        </Flex>
        <Flex>
          {renderTimestampSection()}
          <ExpandIconContainer hidden={!is_collapsible}>
            <i className="material-icons expand-icon">
              {isExpanded ? "expand_less" : "expand_more"}
            </i>
          </ExpandIconContainer>
        </Flex>
      </InfraHeader>
      {renderExpandedContents()}
    </StyledInfraObject>
  );
};

type V2InfraObjectProps = {
  infra: Infrastructure;
  project_id: number;
  is_expanded: boolean;
  is_collapsible: boolean;
  set_max_width?: boolean;
  can_delete?: boolean;
  updateInfraStatus: (infra: Infrastructure) => void;
};

const V2InfraObject: React.FC<V2InfraObjectProps> = ({
  infra,
  project_id,
  is_expanded,
  is_collapsible,
  set_max_width,
  can_delete,
  updateInfraStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState(is_expanded);
  const [isInProgress, setIsInProgress] = useState(
    infra.status == "creating" ||
      infra.status == "updating" ||
      infra.status == "deleting"
  );
  const [fullInfra, setFullInfra] = useState<Infrastructure>(null);
  const [infraState, setInfraState] = useState<TFState>(null);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ((isExpanded || isInProgress) && !fullInfra) {
      refreshInfra();
    }
  }, [infra, project_id, isExpanded, isInProgress]);

  useEffect(() => {
    if ((isExpanded || isInProgress) && !infraState) {
      refreshInfraState();
    }
  }, [infra, project_id, isExpanded, isInProgress]);

  const refreshInfraState = () => {
    api
      .getInfraState(
        "<token>",
        {},
        {
          project_id: project_id,
          infra_id: infra.id,
        }
      )
      .then(({ data }) => {
        setInfraState(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const refreshInfra = (completed?: boolean, errored?: boolean) => {
    setIsLoading(true);

    api
      .getInfraByID(
        "<token>",
        {},
        {
          project_id: project_id,
          infra_id: infra.id,
        }
      )
      .then(({ data }) => {
        let infra = data as Infrastructure;

        if (completed && infra.latest_operation) {
          if (errored) {
            infra.latest_operation.status = "errored";
          } else {
            infra.latest_operation.status = "completed";
          }
        }

        setFullInfra(infra);
        updateInfraStatus(infra);

        // re-query for the infra state
        refreshInfraState();

        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const renderExpandedContentsCreated = () => {
    return (
      <OperationDetails
        infra={fullInfra}
        can_delete={can_delete}
        refreshInfra={refreshInfra}
      />
    );
  };

  const renderExpandedContents = () => {
    if (!isExpanded) {
      return null;
    } else if (fullInfra) {
      return renderExpandedContentsCreated();
    }

    return (
      <ErrorWrapper>
        <Placeholder>
          <Loading />{" "}
        </Placeholder>
      </ErrorWrapper>
    );
  };

  const renderTimestampSection = () => {
    let timestampLabel = "Started at";

    switch (infra.status) {
      case "created":
        timestampLabel = "Created at";
        break;
      case "deleted":
        timestampLabel = "Deleted at";
        break;
      case "errored":
        timestampLabel = "Errored at";
        break;
    }

    return (
      <Timestamp>
        {timestampLabel} {readableDate(infra.updated_at)}
      </Timestamp>
    );
  };

  return (
    <StyledInfraObject key={infra.id} set_max_width={set_max_width}>
      <InfraHeader
        is_clickable={is_collapsible}
        onClick={() => {
          if (is_collapsible) {
            setIsExpanded((val) => {
              setIsLoading(true);
              return !val;
            });
          }
        }}
      >
        <Flex>
          {integrationList[infra.kind] && (
            <Icon src={integrationList[infra.kind].icon} />
          )}
          {KindMap[infra.kind]?.provider_name}
        </Flex>
        <Flex>
          {renderTimestampSection()}
          <ExpandIconContainer hidden={!is_collapsible}>
            <i className="material-icons expand-icon">
              {isExpanded ? "expand_less" : "expand_more"}
            </i>
          </ExpandIconContainer>
        </Flex>
      </InfraHeader>
      {renderExpandedContents()}
    </StyledInfraObject>
  );
};

type OperationDetailsProps = {
  infra: Infrastructure;
  can_delete?: boolean;
  refreshInfra: (completed?: boolean, errored?: boolean) => void;
  useOperation?: Operation;
  padding?: string;
};

export const OperationDetails: React.FunctionComponent<OperationDetailsProps> = ({
  infra,
  can_delete,
  refreshInfra,
  useOperation,
  padding,
}) => {
  const [isLoading, setIsLoading] = useState(!useOperation);
  const [hasError, setHasError] = useState(false);
  const [operation, setOperation] = useState<Operation>(useOperation);

  const [infraState, setInfraState] = useState<TFState>(null);
  const [infraStateInitialized, setInfraStateInitialized] = useState(false);
  const { currentProject, setCurrentError } = useContext(Context);
  const [erroredResources, setErroredResources] = useState<TFResourceState[]>(
    []
  );
  const [createdResources, setCreatedResources] = useState<TFResourceState[]>(
    []
  );
  const [deletedResources, setDeletedResources] = useState<TFResourceState[]>(
    []
  );
  const [plannedResources, setPlannedResources] = useState<TFResourceState[]>(
    []
  );

  const { newWebsocket, openWebsocket, closeWebsocket } = useWebsockets();

  const parseOperationWebsocketEvent = (evt: MessageEvent) => {
    let { status, resource_id, error } = JSON.parse(evt.data);

    if (status == "OPERATION_COMPLETED") {
      // if the operation is completed, call the completed handler
      refreshInfra(true, erroredResources.length > 0);
    } else if (status && resource_id) {
      // if the status and resource_id are defined, add this to the infra state
      setInfraState((curr) => {
        let currCopy: TFState = {
          last_updated: curr.last_updated,
          operation_id: curr.operation_id,
          status: curr.status,
          resources: { ...curr.resources },
        };

        if (currCopy.resources[resource_id]) {
          currCopy.resources[resource_id].status = status;
          currCopy.resources[resource_id].error = error;
        } else {
          currCopy.resources[resource_id] = {
            id: resource_id,
            status: status,
            error: error,
          };
        }

        return currCopy;
      });
    }
  };

  const setupOperationWebsocket = (websocketID: string) => {
    let apiPath = `/api/projects/${currentProject.id}/infras/${infra.id}/operations/${infra.latest_operation.id}/state`;

    const wsConfig = {
      onopen: () => {
        // console.log(`connected to websocket:`, websocketID);
      },
      onmessage: parseOperationWebsocketEvent,
      onclose: () => {
        // console.log(`closing websocket:`, websocketID);
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
    // if the latest_operation is in progress, open a websocket
    if (infraStateInitialized && infra.latest_operation.status === "starting") {
      const websocketID = infra.latest_operation.id;

      setupOperationWebsocket(websocketID);

      return () => {
        closeWebsocket(websocketID);
      };
    }
  }, [infraStateInitialized]);

  useEffect(() => {
    api
      .getInfraState(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra.id,
        }
      )
      .then(({ data }) => {
        setInfraState(data);
        setIsLoading(false);
        setInfraStateInitialized(true);
      })
      .catch((err) => {
        console.error(err);

        if (!infraStateInitialized) {
          setInfraState({
            last_updated: "",
            operation_id: infra.latest_operation.id,
            status: "creating",
            resources: {},
          });
          setInfraStateInitialized(true);
        }
      });
  }, [currentProject, infra]);

  useEffect(() => {
    api
      .getOperation(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra.id,
          operation_id: useOperation?.id || infra.latest_operation.id,
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
  }, [currentProject, infra]);

  useEffect(() => {
    if (infraState && infraState.resources) {
      setErroredResources(
        Object.keys(infraState.resources)
          .map((key) => {
            if (
              infraState.resources[key].error &&
              infraState.resources[key].error != null
            ) {
              return infraState.resources[key];
            }

            return null;
          })
          .filter((val) => val)
      );

      setCreatedResources(
        Object.keys(infraState.resources)
          .map((key) => {
            if (infraState.resources[key].status == "created") {
              return infraState.resources[key];
            }

            return null;
          })
          .filter((val) => val)
      );

      setDeletedResources(
        Object.keys(infraState.resources)
          .map((key) => {
            if (infraState.resources[key].status == "deleted") {
              return infraState.resources[key];
            }

            return null;
          })
          .filter((val) => val)
      );

      setPlannedResources(
        Object.keys(infraState.resources)
          .map((key) => {
            if (
              infraState.resources[key].status == "planned_create" ||
              infraState.resources[key].status == "planned_delete"
            ) {
              return infraState.resources[key];
            }

            return null;
          })
          .filter((val) => val)
      );
    }
  }, [infraState]);

  if (isLoading || !infraState || !operation) {
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
            "Status: infrastructure creation in progress, started at " +
            readableDate(time)
          );
        } else if (status == "completed") {
          return (
            "Status: infrastructure creation completed at " + readableDate(time)
          );
        } else if (status == "errored") {
          return "Status: this infrastructure encountered an error while creating.";
        }
      case "update":
        if (status == "starting") {
          return (
            "Status: infrastructure update in progress, started at " +
            readableDate(time)
          );
        } else if (status == "completed") {
          return (
            "Status: infrastructure update completed at " + readableDate(time)
          );
        } else if (status == "errored") {
          return "Status: this infrastructure encountered an error while updating.";
        }
      case "retry_delete":
      case "delete":
        if (status == "starting") {
          return (
            "Status: infrastructure deletion in progress, started at " +
            readableDate(time)
          );
        } else if (status == "completed") {
          return (
            "Status: infrastructure deletion completed at " + readableDate(time)
          );
        } else if (status == "errored") {
          return "Status: this infrastructure encountered an error while deleting.";
        }
    }
  };

  const deleteInfra = () => {
    api
      .deleteInfra(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra.id,
        }
      )
      .then(({ data }) => {
        refreshInfra();
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const getOperationAction = (status: OperationStatus) => {
    if (can_delete && status == "errored") {
      return (
        <Button color="#b91133" onClick={deleteInfra}>
          Delete Infra
        </Button>
      );
    }
  };

  const renderLoadingBar = (
    completedResourceCount: number,
    plannedResourceCount: number
  ) => {
    let width = (100.0 * completedResourceCount) / plannedResourceCount;
    let operationKind = "Created";
    let count = `${completedResourceCount} / ${plannedResourceCount}`;

    if (
      infra.latest_operation.status == "completed" &&
      (infra.latest_operation.type == "delete" ||
        infra.latest_operation.type == "retry_delete")
    ) {
      width = 100.0;
      count = "";
    } else if (
      infra.latest_operation.status != "completed" &&
      plannedResourceCount == 0
    ) {
      // in the case when the planned resource count is 0, the state is still being computed, so
      // render 0 width and "Planning..." message
      width = 0;
      operationKind = "Planning...";
      count = "";
    }

    if (operationKind != "Planning...") {
      switch (infra.latest_operation.type) {
        case "retry_create":
        case "create":
          operationKind = "Created";
          break;
        case "update":
          operationKind = "Updated";
          break;
        case "retry_delete":
        case "delete":
          operationKind = "Deleted";
      }
    }

    return (
      <StatusContainer>
        <LoadingBar>
          <LoadingFill status="loading" width={width + "%"} />
        </LoadingBar>
        <ResourceNumber>{`${count} ${operationKind}`}</ResourceNumber>
      </StatusContainer>
    );
  };

  const renderErrorSection = () => {
    if (erroredResources.length > 0 && infra?.latest_operation?.errored) {
      return (
        <>
          <Description>
            Encountered the following errors while provisioning:
          </Description>
          <ErrorWrapper>
            {erroredResources.map((resource, index) => {
              return (
                <ExpandedError key={index}>{resource.error}</ExpandedError>
              );
            })}
          </ErrorWrapper>
        </>
      );
    }
  };

  return (
    <StyledCard padding={padding}>
      {renderLoadingBar(
        createdResources.length + deletedResources.length,
        createdResources.length +
          erroredResources.length +
          plannedResources.length
      )}
      <Description>
        {getOperationDescription(
          operation.type,
          operation.status,
          operation.last_updated
        )}
      </Description>
      {renderErrorSection()}
      {getOperationAction(operation.status)}
    </StyledCard>
  );
};

const StyledCard = styled.div<{ padding?: string }>`
  padding: ${(props) => props.padding || "12px 20px"};
  max-height: 300px;
  overflow-y: auto;
`;

const StyledV1Card = styled(StyledCard)`
  padding: 0 20px 12px 20px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const Timestamp = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: #ffffff55;
`;

const Icon = styled.img`
  height: 20px;
  margin-right: 10px;
`;

const ErrorWrapper = styled.div`
  margin-top: 20px;
  overflow-y: auto;
  user-select: text;
  padding: 0 15px;
`;

const ExpandedError = styled.div`
  background: #ffffff22;
  border-radius: 5px;
  padding: 15px;
  font-size: 13px;
  font-family: monospace;
  border: 1px solid #aaaabb;
  margin-bottom: 17px;
  padding-bottom: 17px;
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ResourceNumber = styled.div`
  font-size: 12px;
  margin-left: 7px;
  min-width: 100px;
  text-align: right;
  color: #aaaabb;
`;

const movingGradient = keyframes`
  0% {
      background-position: left bottom;
  }

  100% {
      background-position: right bottom;
  }
`;

const StyledProvisionerStatus = styled.div`
  margin-top: 25px;
`;

const StyledInfraObject = styled.div<{ set_max_width?: boolean }>`
  background: #ffffff1a;
  border: 1px solid #aaaabb;
  border-radius: 5px;
  margin-bottom: 10px;
  position: relative;
  width: ${(props) => (props.set_max_width ? "580px" : "100%")};
`;

const InfraHeader = styled.div<{ is_clickable: boolean }>`
  font-size: 13px;
  font-weight: 500;
  justify-content: space-between;
  padding: 15px;
  display: flex;
  align-items: center;
  cursor: ${(props) => (props.is_clickable ? "pointer" : "default")};
  height: 50px;

  :hover {
    background: ${(props) => (props.is_clickable ? "#ffffff12" : "none")};
  }

  .expand-icon {
    display: none;
    color: #ffffff55;
  }

  :hover .expand-icon {
    display: inline-block;
  }
`;

const LoadingBar = styled.div`
  background: #ffffff22;
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 100px;
`;

const LoadingFill = styled.div<{ width: string; status: string }>`
  width: ${(props) => props.width};
  background: ${(props) =>
    props.status === "successful"
      ? "rgb(56, 168, 138)"
      : props.status === "error"
      ? "#fcba03"
      : "linear-gradient(to right, #8ce1ff, #616FEE)"};
  height: 100%;
  background-size: 250% 100%;
  animation: ${movingGradient} 2s infinite;
  animation-timing-function: ease-in-out;
  animation-direction: alternate;
`;

const ExpandIconContainer = styled.div<{ hidden: boolean }>`
  width: 30px;
  margin-left: 10px;
  padding-top: 2px;
  display: ${(props) => (props.hidden ? "none" : "inline")};
`;

const DeleteAction = styled.span`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  text-align: left;
  border: 1px solid #ffffff55;
  border-radius: 8px;
  background: #ffffff11;
  color: #ffffffdd;
  cursor: pointer;
  margin-top: 20px;
  max-width: 120px;
`;

const Button = styled.button`
  height: 35px;
  font-size: 13px;
  margin: 10px 0;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;
