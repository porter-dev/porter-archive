import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../../shared/Context';
import { ResourceType } from '../../../../shared/types';

import GraphDisplay from './graph/GraphDisplay';
import Loading from '../../../../components/Loading';

type PropsType = {
  components: ResourceType[],
  setSidebar: (x: boolean) => void
};

type StateType = {
  isExpanded: boolean
};

export default class GraphSection extends Component<PropsType, StateType> {
  state = {
    isExpanded: false
  }

  renderContents = () => {
    if (this.props.components && this.props.components.length > 0) {
      return (
        <GraphDisplay
          setSidebar={this.props.setSidebar}
          components={this.props.components}
          isExpanded={this.state.isExpanded}
        />
      );
    }

    return <Loading offset='-30px' />;
  }

  render() {
    return (
      <StyledGraphSection>
        {this.renderContents()}
      </StyledGraphSection>
    );
  }
}

GraphSection.contextType = Context;

const StyledGraphSection = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
`;
