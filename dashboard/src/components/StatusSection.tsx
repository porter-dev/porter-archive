import React, { Component } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";

type PropsType = {
  status: string;
};

type StateType = {};

// TODO: replace StatusIndicator
export default class StatusSection extends Component<PropsType, StateType> {
  renderIndicator = (status: string) => {
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

  render() {
    return (
      <Status>
        {this.renderIndicator(this.props.status)}
        {this.props.status}
      </Status>
    );
  }
}

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 15px;
  margin-bottom: -3px;
`;

const StatusColor = styled.div`
  margin-top: 1px;
  max-width: 8px;
  max-height: 8px;
  min-width: 8px;
  min-height: 8px;
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "deployed" || props.status === "healthy"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 4px;
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

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
