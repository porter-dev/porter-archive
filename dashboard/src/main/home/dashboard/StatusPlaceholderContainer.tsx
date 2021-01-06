import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import StatusPlaceholder from './StatusPlaceholder';

type PropsType = {
  setCurrentView: (x: string) => void,
};

type StateType = {
};

// Props in context to project section to trigger update on context change
export default class StatusPlaceholderContainer extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return (
      <StatusPlaceholder
        setCurrentView={this.props.setCurrentView}
        currentCluster={this.context.currentCluster}
      />
    );
  }
}

StatusPlaceholderContainer.contextType = Context;