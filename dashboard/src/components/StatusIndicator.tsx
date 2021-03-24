import React, { Component } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";

type PropsType = {
  status: string;
  controllers: Record<string, Record<string, any>>;
  margin_left: string;
};

type StateType = {};

// Manages a tab selector and renders the associated view
export default class StatusIndicator extends Component<PropsType, StateType> {
  renderStatus = (status: string) => {
    if (status == "loading") {
      return (
        <div>
          <Spinner src={loading} />
        </div>
      );
    }

    return (
      <div>
        <StatusColor status={status} />
      </div>
    );
  };

  getChartStatus = (chartStatus: string) => {
    if (chartStatus === "deployed") {
      for (var uid in this.props.controllers) {
        let value = this.props.controllers[uid];
        let available = this.getAvailability(value.metadata.kind, value);
        let progressing = true;

        this.props.controllers[uid]?.status?.conditions?.forEach(
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

  getAvailability = (kind: string, c: any) => {
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

  render() {
    let status = this.getChartStatus(this.props.status);
    return (
      <Status margin_left={this.props.margin_left}>
        {this.renderStatus(status)}
        {status}
      </Status>
    );
  }
}

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 15px;
  margin-bottom: -1px;
`;

const StatusColor = styled.div`
  margin-bottom: 1px;
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
  margin-right: 16px;
`;

const Status = styled.div`
  display: flex;
  height: 20px;
  font-size: 13px;
  flex-direction: row;
  text-transform: capitalize;
  align-items: center;
  font-family: "Hind Siliguri", sans-serif;
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
