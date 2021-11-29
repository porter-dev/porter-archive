import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled, { keyframes } from "styled-components";

type LogBucketCardProps = {
  logEvent: any;
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

      if (!Array.isArray(logsData.logs)) {
        setLogs([]);
        setIsLoading(false);
        return;
      }

      const filteredLogs = logsData.logs.filter((log: string | unknown) => {
        if (typeof log === "string") {
          return log.length;
        }
        return false;
      });
      setLogs(filteredLogs);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    if (!Array.isArray(logs) || !logs.length) {
      getLogsForBucket();
    }
  }, [currentProject, currentCluster, logEvent, isExpanded]);

  return (
    <StyledCard>
      <FlexCenter expandLogs={isExpanded}>
        <ShowLogsButton
          onClick={() => setIsExpanded((prevIsExpanded) => !prevIsExpanded)}
        >
          {isExpanded ? "Hide logs" : "Display logs"}
          <ButtonIcon className="material-icons">
            {isExpanded ? "arrow_drop_up" : "arrow_drop_down"}
          </ButtonIcon>
        </ShowLogsButton>
      </FlexCenter>
      {isExpanded && (
        <>
          {/* Case: Is still getting logs and user triggered expanded */}
          {isLoading && <Loading>Loading . . .</Loading>}
          {/* Case: No logs found after the api call */}
          {!isLoading && !logs?.length && <Loading>No logs found.</Loading>}
          {/* Case: Logs were found successfully  */}
          {!isLoading && logs?.length && logs?.map((l) => <Log>{l}</Log>)}
        </>
      )}
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

const FlexCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  ${(props: { expandLogs: boolean }) => {
    if (!props.expandLogs) {
      return "";
    }

    return `
      border-bottom: solid 1px;
      padding-bottom: 15px;
      margin-bottom: 15px;
      border-color: #515256;
    `;
  }}
  transition-property: all;
  transition-duration: 0.5s;
  transition-timing-function: cubic-bezier(0, 1, 0.5, 1);
`;

const fadeInKeyframe = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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

  animation: ${fadeInKeyframe} 0.5s;
`;

const ShowLogsButton = styled.button`
  border: solid 1px;
  border-radius: 10px;
  border-color: #515256;
  color: white;
  background: none;
  padding: 8px 12px 8px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  :hover {
    cursor: pointer;
    background: #5152569c;
  }
`;

const ButtonIcon = styled.i`
  padding-left: 5px;
`;
