import React, { Component } from 'react';
import styled from 'styled-components';

import TabSelector from './TabSelector';

type PropsType = {
  options: { label: string, value: string }[],
  tabContents: any,
  defaultTab?: string
};

type StateType = {
  currentTab: string
};

// Manages a tab selector and renders the associated view
export default class TabRegion extends Component<PropsType, StateType> {
  state = {
    currentTab: this.props.defaultTab
  }

  setDefaultTab = () => {
    if (!this.props.defaultTab && this.props.options[0]) {
      this.setState({ currentTab: this.props.options[0].value });
    }
  }

  componentDidMount() {
    this.setDefaultTab();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.options !== this.props.options) {
      this.setDefaultTab();
    }
  }

  renderTabContents = () => {
    let found = this.props.tabContents.find((el: any) => el.value === this.state.currentTab);
    if (found) {
      return found.component;
    }
  }

  render() {
    return (
      <StyledTabRegion>
        <TabSelector
          options={this.props.options}
          currentTab={this.state.currentTab}
          setCurrentTab={(x: string) => this.setState({ currentTab: x })}
        />
        <Gap />
        {this.renderTabContents()}
      </StyledTabRegion>
    );
  }
}

const Gap = styled.div`
  width: 100%;
  background: none;
  height: 30px;
`;

const StyledTabRegion = styled.div`
  width: 100%;
  height: 100%;
  padding-bottom: 70px;
  position: relative;
`;