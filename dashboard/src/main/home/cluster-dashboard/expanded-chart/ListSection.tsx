import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../../shared/Context';
import { ResourceType, ChartType } from '../../../../shared/types';

import ResourceItem from './ResourceItem';
import Loading from '../../../../components/Loading';

type PropsType = {
  currentChart: ChartType,
  components: ResourceType[]
};

type StateType = {
  showKindLabels: boolean
};

export default class ListSection extends Component<PropsType, StateType> {
  state = {
    showKindLabels: true
  }

  renderResourceList = () => {
    return this.props.components.map((resource: ResourceType, i: number) => {
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
    if (this.props.components && this.props.components.length > 0) {
      return (
        <ResourceList>
          {this.renderResourceList()}
        </ResourceList>
      );
    }

    return <Loading offset='-30px' />;
  }

  render() {
    return (
      <StyledListSection>
        {this.renderContents()}
      </StyledListSection>
    );
  }
}

ListSection.contextType = Context;

const ResourceList = styled.div`
  width: 100%;
  overflow-y: auto;
  padding-bottom: 150px;
`;

const StyledListSection = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  display: flex;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
`;