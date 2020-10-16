import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../shared/api';

import { Context } from '../../../../shared/Context';
import { ResourceType, StorageType, ChartType } from '../../../../shared/types';

import GraphDisplay from './graph/GraphDisplay';
import Loading from '../../../../components/Loading';

type PropsType = {
  currentChart: ChartType,
  components: ResourceType[]
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
          components={this.props.components}
          isExpanded={this.state.isExpanded}
        />
      );
    }

    return <Loading offset='-30px' />;
  }

  render() {
    return (
      <StyledGraphSection isExpanded={this.state.isExpanded}>
        {this.renderContents()}
        <ButtonSection>
          <ExpandButton
            onClick={() => this.setState({ isExpanded: !this.state.isExpanded })}
          >
            <i className="material-icons">
              {this.state.isExpanded ? 'close_fullscreen' : 'open_in_full'}
            </i>
          </ExpandButton>
        </ButtonSection>
      </StyledGraphSection>
    );
  }
}

GraphSection.contextType = Context;

const StyledGraphSection = styled.div`
  width: ${(props: { isExpanded: boolean }) => props.isExpanded ? '100vw' : '100%'};
  height: ${(props: { isExpanded: boolean }) => props.isExpanded ? '100vh' : '100%'};
  background: #202227;
  position: ${(props: { isExpanded: boolean }) => props.isExpanded ? 'fixed' : 'relative'};
  top: ${(props: { isExpanded: boolean }) => props.isExpanded ? '-25px' : ''};
  right: ${(props: { isExpanded: boolean }) => props.isExpanded ? '-25px' : ''};
`;

const ButtonSection = styled.div`
  position: absolute;
  top: 17px;
  right: 15px;
  display: flex;
  align-items: center;
`;

const ExpandButton = styled.div`
  width: 24px;
  height: 24px;
  cursor: pointer;
  margin-left: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  border: 1px solid #ffffff44;

  :hover {
    background: #ffffff44; 
  }

  > i {
    font-size: 14px;
  }
`;