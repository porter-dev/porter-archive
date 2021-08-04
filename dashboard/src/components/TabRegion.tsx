import React, { Component } from "react";
import styled from "styled-components";

import TabSelector from "./TabSelector";
import Loading from "./Loading";

export interface TabOption {
  label: string;
  value: string;
}

type PropsType = {
  options: TabOption[];
  currentTab: string;
  setCurrentTab: (x: string) => void;
  defaultTab?: string;
  addendum?: any;
  color?: string | null;
  suppressAnimation?: boolean;
};

type StateType = {};

// Manages a tab selector and renders the associated view
export default class TabRegion extends Component<PropsType, StateType> {
  defaultTab = () =>
    this.props.defaultTab
      ? this.props.defaultTab
      : this.props.options[0]
      ? this.props.options[0].value
      : "";

  componentDidUpdate(prevProps: PropsType) {
    let { options, currentTab } = this.props;
    if (prevProps.options !== options) {
      if (options.filter((x) => x.value === currentTab).length === 0) {
        this.props.setCurrentTab(this.defaultTab());
      }
    }
  }

  render() {
    return (
      <StyledTabRegion suppressAnimation={this.props.suppressAnimation}>
        {
          !this.props.currentTab ? (
            <Loading />
          ) : (
            <>
              <TabSelector
                options={this.props.options}
                color={this.props.color}
                currentTab={this.props.currentTab}
                setCurrentTab={(x: string) => this.props.setCurrentTab(x)}
                addendum={this.props.addendum}
              />
              <Gap />
              <TabContents>{this.props.children}</TabContents>
            </>
          )
        }
      </StyledTabRegion>
    );
  }
}

const TabContents = styled.div`
  height: calc(100% - 65px);
`;

const Gap = styled.div`
  width: 100%;
  background: none;
  height: 30px;
`;

const StyledTabRegion = styled.div<{ suppressAnimation: boolean }>`
  width: 100%;
  height: 100%;
  animation: ${props => props.suppressAnimation ? "" : "fadeIn 0.25s 0s"};
  position: relative;
  overflow-y: auto;
  overflow: visible;
`;
