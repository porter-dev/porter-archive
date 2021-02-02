import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from 'shared/Context';
import ClusterPlaceholder from './ClusterPlaceholder';

type PropsType = {
  setCurrentView: (x: string) => void,
};

type StateType = {
};

// Props in context to project section to trigger update on context change
export default class ClusterPlaceholderContainer extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return (
      <ClusterPlaceholder
        setCurrentView={this.props.setCurrentView}
        currentCluster={this.context.currentCluster}
      />
    );
  }
}

ClusterPlaceholderContainer.contextType = Context;