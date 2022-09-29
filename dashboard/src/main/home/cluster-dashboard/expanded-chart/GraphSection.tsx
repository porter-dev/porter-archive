import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { ChartType, ResourceType } from "shared/types";

import GraphDisplay from "./graph/GraphDisplay";
import Loading from "components/Loading";

type PropsType = {
  components: ResourceType[];
  currentChart: ChartType;
  setSidebar: (x: boolean) => void;
  showRevisions: boolean;
};

type StateType = {
  isExpanded: boolean;
};

export default class GraphSection extends Component<PropsType, StateType> {
  state = {
    isExpanded: false,
  };

  renderContents = () => {
    if (this.props.components && this.props.components.length > 0) {
      return (
        <GraphDisplay
          setSidebar={this.props.setSidebar}
          components={this.props.components}
          isExpanded={this.state.isExpanded}
          currentChart={this.props.currentChart}
          showRevisions={this.props.showRevisions}
        />
      );
    }

    return <Loading offset="-30px" />;
  };

  render() {
    return <StyledGraphSection>{this.renderContents()}</StyledGraphSection>;
  }
}

GraphSection.contextType = Context;

const StyledGraphSection = styled.div`
  width: 100%;
  min-height: 400px;
  height: calc(100vh - 400px);
  font-size: 13px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #ffffff33;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
