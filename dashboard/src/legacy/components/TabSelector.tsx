import React, { Component } from "react";
import styled from "styled-components";

import Spacer from "./porter/Spacer";

export type selectOption<T> = {
  value: T;
  label: string;
  component?: any;
  sibling?: JSX.Element;
};

type PropsType<T> = {
  currentTab: string;
  options: Array<selectOption<T>>;
  setCurrentTab: (value: T) => void;
  addendum?: any;
  color?: string;
  noBuffer?: boolean;
};

type StateType = {};

export default class TabSelector<T> extends Component<PropsType<T>, StateType> {
  getCurrentComponent() {
    const currentOption = this.props.options.find(
      (option) => option.value === this.props.currentTab
    );
    if (currentOption?.component) {
      return currentOption.component;
    }
    return null;
  }

  handleTabClick = (value: T) => {
    this.props.setCurrentTab(value);
  };

  renderTabList = () => {
    const color = this.props.color ?? "#aaaabb";
    return this.props.options.map((option: selectOption<T>, i: number) => {
      return option.sibling ? (
        <TabWithSibling>
          <Tab
            key={i}
            onClick={() => {
              this.handleTabClick(option.value);
            }}
            lastItem={i === this.props.options.length - 1}
            highlight={option.value === this.props.currentTab ? color : null}
            style={{ marginRight: "0px" }}
          >
            {option.label}
          </Tab>
          <Spacer inline x={0.5} />
          {option.sibling}
        </TabWithSibling>
      ) : (
        <Tab
          key={i}
          onClick={() => {
            this.handleTabClick(option.value);
          }}
          lastItem={i === this.props.options.length - 1}
          highlight={option.value === this.props.currentTab ? color : null}
        >
          {option.label}
        </Tab>
      );
    });
  };

  renderAddendumBuffer = (): JSX.Element => {
    return <Buffer />;
  };

  render(): JSX.Element {
    return (
      <>
        <StyledTabSelector>
          <TabWrapper>
            <Line />
            {this.renderTabList()}
            <Tab lastItem={true} highlight={null}>
              {this.props.noBuffer ? null : <Buffer />}
            </Tab>
          </TabWrapper>
          {this.props.addendum}
        </StyledTabSelector>
        {this.getCurrentComponent()}
      </>
    );
  }
}

const Line = styled.div`
  height: 1px;
  position: absolute;
  top: 29px;
  z-index: 0;
  left: 0;
  background: #aaaabb55;
  width: 100%;
`;

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
  margin-right: ${(props: { lastItem: boolean; highlight: string | null }) =>
    props.lastItem ? "" : "30px"};
  display: flex;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  user-select: none;
  color: ${(props: { lastItem: boolean; highlight: string | null }) =>
    props.highlight ? props.highlight : "#aaaabb55"};
  flex-direction: column;
  padding-top: 7px;
  padding-bottom: 2px;
  margin-bottom: -2px;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; highlight: string | null }) =>
      props.highlight ? props.highlight : "none"};
  :hover {
    color: ${(props: { lastItem: boolean; highlight: string | null }) =>
      props.highlight ? "" : "#aaaabb"};
  }
`;

const StyledTabSelector = styled.div`
  display: flex;
  width: calc(100% - 2px);
  align-items: center;
  padding-bottom: 1px;
  margin-left: 1px;
  position: relative;
`;

const TabWithSibling = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 30px;
`;
