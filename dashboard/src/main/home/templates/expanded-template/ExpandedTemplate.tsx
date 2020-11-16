import React, { Component } from 'react';
import styled from 'styled-components';

import { PorterChart } from '../../../../shared/types';

import TemplateInfo from './TemplateInfo';
import LaunchTemplate from './LaunchTemplate';

type PropsType = {
  currentTemplate: PorterChart,
  setCurrentTemplate: (x: PorterChart) => void
};

type StateType = {
  showLaunchTemplate: boolean
};

export default class ExpandedTemplate extends Component<PropsType, StateType> {
  state = {
    showLaunchTemplate: false
  }

  renderContents = () => {
    if (this.state.showLaunchTemplate) {
      return (
        <LaunchTemplate
          currentTemplate={this.props.currentTemplate}
          hideLaunch={() => this.setState({ showLaunchTemplate: false })}
        />
      );
    }

    return (
      <TemplateInfo
        currentTemplate={this.props.currentTemplate}
        setCurrentTemplate={this.props.setCurrentTemplate}
        launchTemplate={() => this.setState({ showLaunchTemplate: true })}
      />
    );
  }

  render() {
    return (
      <StyledExpandedTemplate>
        {this.renderContents()}
      </StyledExpandedTemplate>
    );
  }
}

const StyledExpandedTemplate = styled.div`
  width: calc(90% - 150px);
  min-width: 300px;
  padding-top: 30px;
`;