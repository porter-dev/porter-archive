import React, { Component } from 'react';
import styled from 'styled-components';

import { ResourceType } from '../../../../shared/types';

import ResourceItem from './ResourceItem';

type PropsType = {
  toggleExpanded: () => void,
  isExpanded: boolean
};

type StateType = {
  viewMode: string,
  showKindLabels: boolean
};

const dummyObjects = [
  {
    kind: 'deployment', name: 'radical-conspirator', rawYaml: {
      stuff: {
        idk: 'test'
      }
    }
  },
  { kind: 'service', name: 'fawkes-guy', rawYaml: {
      stuff: {
        idk: 'test'
      }
    }
  },
  { kind: 'ingress', name: 'bellion-john', rawYaml: {
      stuff: {
        idk: 'test'
      }
    }
  },
  { kind: 'pod', name: 'tenet-tenet', rawYaml: {
      stuff: {
        idk: 'test'
      }
    }
  },
  { kind: 'statefulset', name: 'brokerage-farm', rawYaml: {
      stuff: {
        idk: 'test'
      }
    }
  }
];

export default class OverviewSection extends Component<PropsType, StateType> {
  state = {
    viewMode: 'graph',
    showKindLabels: true
  }

  renderResourceList = () => {
    return dummyObjects.map((resource: ResourceType, i: number) => {
      return (
        <ResourceItem
          key={i}
          resource={resource}
          toggleKindLabels={() => this.setState({ showKindLabels: !this.state.showKindLabels })}
          showKindLabels={this.state.showKindLabels}
        />
      );
    });
  }

  renderContents = () => {
    if (this.state.viewMode === 'list') {
      return (
        <ResourceList>
          {this.renderResourceList()}
        </ResourceList>
      )
    }
  }

  render() {
    return (
      <StyledOverviewSection>
        {this.renderContents()}

        <ButtonSection>
          <RadioButtons>
            <RadioOption
              nudge={true}
              selected={this.state.viewMode === 'graph'}
              onClick={() => this.setState({ viewMode: 'graph' })}
            >
              <i className="material-icons">device_hub</i> Graph
            </RadioOption>
            <RadioOption
              selected={this.state.viewMode === 'list'}
              onClick={() => this.setState({ viewMode: 'list' })}
            >
              <i className="material-icons">dehaze</i> List
            </RadioOption>
          </RadioButtons>
          <ExpandButton
            onClick={this.props.toggleExpanded}
            isExpanded={this.props.isExpanded}
          >
            <i className="material-icons">
              {this.props.isExpanded ? 'close_fullscreen' : 'open_in_full'}
            </i>
          </ExpandButton>
        </ButtonSection>
      </StyledOverviewSection>
    );
  }
}

const ResourceList = styled.div`
  width: 100%;
  overflow-y: auto;
  padding-bottom: 150px;
`;

const RadioOption = styled.div`
  width: 80px;
  padding-right: 5px;
  height: 22px;
  background: ${(props: { selected: boolean, nudge?: boolean }) => props.selected ? '#6A6C70' : '#424349'};
  display: flex;
  align-items: center;
  cursor: pointer;
  justify-content: center;
  
  > i {
    margin-top: ${(props: { nudge?: boolean, selected: boolean }) => props.nudge ? '-1px' : ''};
    font-size: 15px;
    margin-right: 8px;
  }
`;

const RadioButtons = styled.div`
  display: flex;
  align-items: center;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  font-size: 12px;
  font-family: 'Works Sans', sans-serif;
  overflow: hidden;
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
  background: ${(props: { isExpanded: boolean }) => props.isExpanded ? '#ffffff44' : ''};

  :hover {
    background: #ffffff44; 
  }

  > i {
    font-size: 14px;
  }
`;

const StyledOverviewSection = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  display: flex;
  position: relative;
`;