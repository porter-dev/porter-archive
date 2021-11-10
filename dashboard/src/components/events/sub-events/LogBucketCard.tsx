import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";

type LogBucketCardProps = {
  logEvent: any;
};

const getReadableDate = (s: number) => {
  let ts = new Date(s);
  let date = ts.toLocaleDateString();
  let time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} ${date}`;
};

const LogBucketCard: React.FunctionComponent<LogBucketCardProps> = ({
  logEvent,
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState([]);

  const getLogsForBucket = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;
    const kube_event_id = logEvent?.parent_id;
    const timestamp = logEvent?.timestamp;
    try {
      const logsData = await api
        .getLogBucketLogs(
          "<token>",
          { timestamp: new Date(timestamp).getTime() },
          { project_id, cluster_id, kube_event_id }
        )
        .then((res) => res?.data);
      setLogs(logsData.logs);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getLogsForBucket();
  }, [currentProject, currentCluster, logEvent]);

  return (
    <StyledCard>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Icon className="material-icons-outlined">info</Icon>
        <InfoWrapper>
          <div>
            <EventName>Logs for: {logEvent.resource_name}</EventName>
          </div>
        </InfoWrapper>
      </div>
      <InfoWrapper>
        <TimestampContainer>
          <i className="material-icons-outlined">access_time</i>
          {getReadableDate(logEvent.timestamp)}
        </TimestampContainer>
        <button onClick={() => setIsExpanded((expanded) => !expanded)}>
          Show more
        </button>
      </InfoWrapper>

      {/* Case: Is still getting logs and user triggered expanded */}
      {isExpanded && isLoading && "Loading"}
      {/* Case: No logs found after the api call */}
      {isExpanded && !isLoading && !logs?.length && "No logs found"}
      {/* Case: Logs were found successfully  */}
      {isExpanded &&
        !isLoading &&
        logs?.length &&
        logs?.map((l) => <span>{l}</span>)}
    </StyledCard>
  );
};

export default LogBucketCard;

const StyledCard = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  border: 1px solid #ffffff44;
  background: #ffffff08;
  margin-bottom: 10px;
  border-radius: 10px;
  padding-left: 20px;
  padding-right: 20px;
  overflow: hidden;
  height: 80px;
  cursor: pointer;
  justify-content: space-between;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff66;
  }
`;

const Icon = styled.span<{ status?: "critical" | "normal" }>`
  font-size: 22px;
  margin-right: 18px;
  color: ${({ status }) =>
    status ? (status === "critical" ? "#cc3d42" : "#38a88a") : "#efefef"};
`;

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const EventName = styled.div`
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const TimestampContainer = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff55;
  font-size: 13px;
  margin-top: 8px;
  justify-self: flex-end;

  > i {
    margin-right: 5px;
    font-size: 18px;
    margin-left: -1px;
  }
`;

const EventReason = styled.div`
  font-size: 16px;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  margin-top: 8px;
`;
