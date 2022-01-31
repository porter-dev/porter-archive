import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import { Operation, OperationStatus, OperationType } from "shared/types";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";

type Props = {
  infra_id: number;
};

const DeployList: React.FunctionComponent<Props> = ({ infra_id }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [operationList, setOperationList] = useState<Operation[]>([]);
  const { currentProject, setCurrentError } = useContext(Context);

  useEffect(() => {
    api
      .listOperations(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra_id,
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
  }, [currentProject]);

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

  const getOperationDescription = (type: OperationType): string => {
    switch (type) {
      case "create":
        return "This infrastructure was created";
      case "update":
        return "The infrastructure configuration was updated";
      default:
        return "The infrastructure configuration was updated";
    }
  };

  return (
    <DatabasesListWrapper>
      <EventsGrid>
        {operationList.map((operation, i) => {
          return (
            <React.Fragment key={i}>
              <StyledCard status={operation.status}>
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
                  <EventInformation>
                    <EventName>
                      <Helper>{operation.type}:</Helper>
                      {getOperationDescription(operation.type)}
                    </EventName>
                  </EventInformation>
                </ContentContainer>
                <ActionContainer>
                  <TimestampContainer>
                    <TimestampIcon className="material-icons-outlined">
                      access_time
                    </TimestampIcon>
                    <span>{readableDate(operation.last_updated)}</span>
                  </TimestampContainer>
                </ActionContainer>
              </StyledCard>
            </React.Fragment>
          );
        })}
      </EventsGrid>
    </DatabasesListWrapper>
  );
};

export default DeployList;

const DatabasesListWrapper = styled.div`
  margin-top: 35px;
`;

const EventsGrid = styled.div`
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
  margin-bottom: 5px;
  border-radius: 10px;
  padding: 14px;
  overflow: hidden;
  height: 80px;
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

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const Helper = styled.span`
  text-transform: capitalize;
  color: #ffffff44;
  margin-right: 5px;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const TimestampContainer = styled.div`
  display: flex;
  white-space: nowrap;
  align-items: center;
  justify-self: flex-end;
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
