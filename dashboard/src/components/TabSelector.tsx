import React, { Component } from "react";
import styled from "styled-components";

export interface selectOption {
  value: string;
  label: string;
}

type PropsType = {
  currentTab: string;
  options: selectOption[];
  setCurrentTab: (value: string) => void;
  addendum?: any;
  color?: string;
  noBuffer?: boolean;
};

type StateType = {};

export default class TabSelector extends Component<PropsType, StateType> {
  handleTabClick = (value: string) => {
    this.props.setCurrentTab(value);
  };

  renderTabList = () => {
    let color = this.props.color || "#949effff";
    return this.props.options.map((option: selectOption, i: number) => {
      return (
        <Tab
          key={i}
          onClick={() => this.handleTabClick(option.value)}
          lastItem={i === this.props.options.length - 1}
          highlight={option.value === this.props.currentTab ? color : null}
        >
          {option.label}
        </Tab>
      );
    });
  };

  renderAddendumBuffer = () => {};

  render() {
    return (
      <StyledTabSelector>
        <TabWrapper>
          {this.renderTabList()}
          <Tab lastItem={true} highlight={null}>
            {this.props.noBuffer ? null : <Buffer />}
          </Tab>
        </TabWrapper>
        {this.props.addendum}
      </StyledTabSelector>
    );
  }
}

const Buffer = styled.div`
  width: 138px;
  height: 10px;
`;

// Keeps the scrollbar beneath all tabs on overflow
const TabWrapper = styled.div`
  display: flex;
  overflow-x: auto;
  padding-bottom: 15px;
  margin-bottom: -15px;
`;

const Tab = styled.div`
  height: 30px;
  margin-right: ${(props: { lastItem: boolean; highlight: string }) =>
    props.lastItem ? "" : "30px"};
  display: flex;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  user-select: none;
  color: ${(props: { lastItem: boolean; highlight: string }) =>
    props.highlight ? props.highlight : "#aaaabb55"};
  flex-direction: column;
  padding-top: 7px;
  padding-bottom: 2px;
  margin-bottom: -2px;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; highlight: string }) =>
      props.highlight ? props.highlight : "none"};
  :hover {
    color: ${(props: { lastItem: boolean; highlight: string }) =>
      props.highlight ? "" : "#aaaabb"};
  }
`;

const StyledTabSelector = styled.div`
  display: flex;
  width: calc(100% - 2px);
  align-items: center;
  border-bottom: 1px solid #aaaabb55;
  padding-bottom: 1px;
  margin-left: 1px;
  position: relative;
`;
