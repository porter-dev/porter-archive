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
    if (isExpanded && (!Array.isArray(logs) || !logs.length)) {
      getLogsForBucket();
    }
  }, [currentProject, currentCluster, logEvent, isExpanded]);

  return (
    <StyledCard>
      {/* Case: Is still getting logs and user triggered expanded */}
      {isLoading && <Loading>Loading . . .</Loading>}
      {/* Case: No logs found after the api call */}
      {!isLoading && !logs?.length && <Loading>No logs found.</Loading>}
      {/* Case: Logs were found successfully  */}
      {!isLoading && logs?.length && logs?.map((l) => <Log>{l}</Log>)}
    </StyledCard>
  );
};

export default LogBucketCard;

const Loading = styled.div`
  margin-top: 5px;
  margin-left: 5px;
`;

const Log = styled.div`
  font-family: monospace, sans-serif;
  font-size: 12px;
  color: white;
`;

const StyledCard = styled.div`
  border: 1px solid #ffffff44;
  margin-bottom: 30px;
  border-radius: 10px;
  padding: 14px;
  padding-left: 13px;
  font-size: 13px;
  background: #121318;
  user-select: text;
  overflow-wrap: break-word;
  overflow-y: auto;
  min-height: 55px;
  color: #aaaabb;

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
