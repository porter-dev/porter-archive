import DynamicLink from "components/DynamicLink";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import EventCard from "components/events/EventCard";
import { getQueryParam, pushFiltered } from "shared/routing";
import { Link } from "react-router-dom";
import { Column } from "react-table";
import styled from "styled-components";
import Table from "components/Table";
import Loading from "components/Loading";
import { integrationList } from "shared/common";
import {
  Operation,
  OperationStatus,
  OperationType,
} from "../InfrastructureList";

const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
};

const readableDate = (s: string) => {
  const ts = new Date(s);
  const date = ts.toLocaleDateString();
  const time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

type Props = {
  infra_id: number;
};

const DeployList: React.FunctionComponent<Props> = ({ infra_id }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [operationList, setOperationList] = useState<Operation[]>([]);
  const { currentProject, currentCluster, setCurrentModal } = useContext(
    Context
  );

  const { url: currentUrl } = useRouteMatch();

  const location = useLocation();
  const history = useHistory();

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

const KindContainer = styled.div`
  display: flex;
  align-items: center;
  min-width: 200px;
`;

const Kind = styled.div`
  margin-left: 8px;
`;

const Placeholder = styled.div`
  padding: 30px;
  margin-top: 35px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: #ffffff11;
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const DatabasesListWrapper = styled.div`
  margin-top: 35px;
`;

const StyledTableWrapper = styled.div`
  background: #26282f;
  padding: 14px;
  border-radius: 8px;
  box-shadow: 0 4px 15px 0px #00000055;
  position: relative;
  border: 2px solid #9eb4ff00;
  width: 100%;
  height: 100%;
  :not(:last-child) {
    margin-bottom: 25px;
  }
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const Url = styled.a`
  max-width: 300px;
  font-size: 13px;
  user-select: text;
  font-weight: 400;
  display: flex;
  align-items: center;
  > i {
    margin-left: 10px;
    font-size: 15px;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :hover {
    cursor: pointer;
  }
`;

const Button = styled(Link)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const ConnectButton = styled.button<{}>`
  height: 25px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: #5561c0;
  box-shadow: 0 2px 5px 0 #00000030;
  cursor: pointer;
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: brightness(120%);
  }
`;

const DashboardIcon = styled.div`
  height: 45px;
  min-width: 45px;
  width: 45px;
  border-radius: 5px;
  margin-right: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  > i {
    font-size: 22px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #7a838f;
  font-size: 13px;
  > i {
    color: #8b949f;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  margin-top: 36px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px 35px;
`;

const StyledTitleSection = styled.div`
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: start;
  font-size: 24px;
  font-weight: 600;
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  margin-left: 1px;
  min-height: 17px;
  color: #a7a6bb;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "created"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 15px;
`;

const ResourceLink = styled(DynamicLink)`
  font-size: 13px;
  font-weight: 400;
  margin-left: 7px;
  color: #aaaabb;
  display: flex;
  align-items: center;

  :hover {
    text-decoration: underline;
    color: white;
  }

  > i {
    margin-left: 7px;
    font-size: 17px;
  }
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

const EventReason = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #aaaabb;
  margin-top: 5px;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const HistoryButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  color: #ffffff44;
  :hover {
    background: #32343a;
    cursor: pointer;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  left: 0px;
  word-wrap: break-word;
  top: 38px;
  min-height: 18px;
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  color: white;
  text-transform: none;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
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
