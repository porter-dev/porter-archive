import React, { Component } from 'react';
import styled from 'styled-components';

import TabSelector from './TabSelector';
import Loading from './Loading';

type PropsType = {
  options: { label: string, value: string }[],
  tabContents: any,
  defaultTab?: string,
  addendum?: any,
};

type StateType = {
  currentTab: string
};

// Manages a tab selector and renders the associated view
// TODO: consider rearchitecturing to support standard re-render
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
    if (prevProps.options !== this.props.options && !this.state.currentTab) {
      this.setDefaultTab();
    }
  }

  renderTabContents = () => {
    let found = this.props.tabContents.find((el: any) => el.value === this.state.currentTab);
    if (found) {
      return found.component;
    }
  }

  renderContents = () => {
    if (!this.state.currentTab) {
      return (
        <Loading />
      );
    }

    return (
      <Div>
        <TabSelector
          options={this.props.options}
          currentTab={this.state.currentTab}
          setCurrentTab={(x: string) => this.setState({ currentTab: x })}
          addendum={this.props.addendum}
        />
        <Gap />
        <TabContents>
          {this.renderTabContents()}
        </TabContents>
      </Div>
    );
  }

  render() {
    return (
      <StyledTabRegion>
        {this.renderContents()}
      </StyledTabRegion>
    );
  }
}

const Div = styled.div`
  width: 100%;
  height: 100%;
  animation: fadeIn 0.25s 0s;
`;

const TabContents = styled.div`
  height: calc(100% - 60px);
`;

const Gap = styled.div`
  width: 100%;
  background: none;
  height: 30px;
`;

const StyledTabRegion = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow-y: auto;
`;