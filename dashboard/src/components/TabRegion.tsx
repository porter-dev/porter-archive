import React, { Component } from 'react';
import styled from 'styled-components';

import TabSelector from './TabSelector';

type PropsType = {
  options: { label: string, value: string }[],
  contents: any,
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

  componentDidMount() {
    if (!this.props.defaultTab) {
      this.setState({ currentTab: this.props.options[0].value });
    }
  }

  renderTabContents = () => {
    let found = this.props.contents.find((el: any) => el.value === this.state.currentTab);
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

        {this.renderTabContents()}
      </StyledTabRegion>
    );
  }
}

const StyledTabRegion = styled.div`
  width: 100%;
  height: 100%;
`;