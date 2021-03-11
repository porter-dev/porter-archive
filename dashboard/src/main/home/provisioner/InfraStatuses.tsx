import React, { Component } from "react";
import styled from "styled-components";

import loadingDots from "assets/loading-dots.gif";
import { InfraType } from "shared/types";
import { infraNames } from "shared/common";

type PropsType = {
  infras: InfraType[];
  selectInfra: (infra: InfraType) => void;
  selectedInfra: InfraType;
};

type StateType = {};

export default class InfraStatuses extends Component<PropsType, StateType> {
  state = {};

  renderStatusIcon = (status: string) => {
    if (status === "created") {
      return <StatusIcon>✓</StatusIcon>;
    } else if (status === "creating" || status === "destroying") {
      return (
        <StatusIcon>
          <img src={loadingDots} />
        </StatusIcon>
      );
    } else if (status === "error" || status === "destroyed") {
      return <StatusIcon color="#e3366d">✗</StatusIcon>;
    }
  };

  render() {
    return (
      <StyledInfraStatuses>
        {this.props.infras.map((infra: InfraType, i: number) => {
          return (
            <InfraRow
              key={infra.id}
              selected={infra.id === this.props.selectedInfra?.id}
              onClick={() => this.props.selectInfra(infra)}
            >
              {infraNames[infra.kind]}
              {this.renderStatusIcon(infra.status)}
            </InfraRow>
          );
        })}
      </StyledInfraStatuses>
    );
  }
}

const StatusIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  font-size: 16px;
  color: ${(props) => (props.color ? props.color : "#68c49c")};
  margin-left: 10px;
`;

const Tab = styled.div`
  width: 100%;
  height: 25px;
  padding-left: 2px;
  margin-top: 10px;
  font-size: 13px;
  color: #aaaabb;
  color: white;
  display: flex;
  align-items: center;
`;

const InfraRow = styled.div`
  width: 100%;
  height: 50px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${(props: { selected: boolean }) =>
    props.selected ? "white" : "#ffffff66"};
  background: ${(props: { selected: boolean }) =>
    props.selected ? "#ffffff18" : ""};
  font-size: 13px;
  padding: 20px 19px 20px 42px;
  text-shadow: 0px 0px 8px none;
  overflow: visible;
  cursor: pointer;
  :hover {
    color: white;
    background: #ffffff18;
  }
`;

const StyledInfraStatuses = styled.div`
  margin-bottom: 0;
`;
