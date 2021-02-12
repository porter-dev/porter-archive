import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { ChartType } from "shared/types";

import Loading from "components/Loading";

type PropsType = {
  currentChart: ChartType;
};

type StateType = {
};

export default class ListSection extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return (
      <StyledMetricsSection>
      </StyledMetricsSection>
    );
  }
}

ListSection.contextType = Context;

const StyledMetricsSection = styled.div`
  width: 100%;
  height: 100%;
  background: #20222700;
  display: flex;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  overflow: hidden;
`;
