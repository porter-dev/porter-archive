import React, { useState, useEffect } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";

type Props = {
  status: string;
  controllers: Record<string, Record<string, any>>;
  margin_left: string;
};

type StateType = {};

// Manages a tab selector and renders the associated view
const StatusIndicator: React.FC<Props> = (props) => {

  useEffect(() => {
    console.log(props.controllers)
  }, []);


  const renderStatus = (status: string) => {
    if (status == "loading") {
      return <Spinner src={loading} />;
    }

    return (
      <StatusCircle >
      </StatusCircle>
    );
  };

  const getChartStatus = (chartStatus: string) => {
    if (chartStatus === "deployed") {
      for (var uid in props.controllers) {
        let value = props.controllers[uid];
        let available = getAvailability(value.metadata.kind, value);
        let progressing = true;

        props.controllers[uid]?.status?.conditions?.forEach(
          (condition: any) => {
            if (
              condition.type == "Progressing" &&
              condition.status == "False" &&
              condition.reason == "ProgressDeadlineExceeded"
            ) {
              progressing = false;
            }
          }
        );

        if (!available && progressing) {
          return "loading";
        } else if (!available && !progressing) {
          return "failed";
        }
      }
      return "deployed";
    }
    return chartStatus;
  };

  const getAvailability = (kind: string, c: any) => {
    switch (kind?.toLowerCase()) {
      case "deployment":
      case "replicaset":
        return c.status.availableReplicas == c.status.replicas;
      case "statefulset":
        return c.status.readyReplicas == c.status.replicas;
      case "daemonset":
        return c.status.numberAvailable == c.status.desiredNumberScheduled;
      case "cronjob":
        return 1;
    }
  };

  return (
    <Status margin_left={props.margin_left}>
      {renderStatus(getChartStatus(props.status))}
      {getChartStatus(props.status)}
    </Status>
  );
}

export default StatusIndicator;

const StatusCircle = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 10px;
  background: 
    conic-gradient(from 0deg, 
      #ffffff33 5%, #ffffffaa 0% 5%);
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 15px;
  margin-bottom: -3px;
`;

const StatusColor = styled.div`
  margin-top: 1px;
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "deployed"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 16px;
`;

const Status = styled.div`
  display: flex;
  height: 20px;
  font-size: 13px;
  flex-direction: row;
  text-transform: capitalize;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  color: #aaaabb;
  animation: fadeIn 0.5s;
  margin-left: ${(props: { margin_left: string }) => props.margin_left};

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
