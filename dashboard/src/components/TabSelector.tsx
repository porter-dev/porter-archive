import React, { Component } from 'react';
import styled from 'styled-components';

export interface selectOption {
  value: string,
  label: string
}

type PropsType = {
  options: selectOption[],
  setCurrentTab: (value: string) => void,
  tabWidth?: string  
};

type StateType = {
  currentTab: string
};

export default class TabSelector extends Component<PropsType, StateType> {
  state = {
    currentTab: 'overview', 
  }

  renderLine = (tab: string): JSX.Element | undefined => {
    if (this.state.currentTab === tab) {
      return <Highlight />
    }
  };

  handleTabClick = (value: string) => {
    this.setState({ currentTab: value });
    this.props.setCurrentTab(value);
  }

  renderTabList = () => {
    return (
      this.props.options.map((option: selectOption, i: number) => {
        return (
          <Tab
            onClick={() => this.handleTabClick(option.value)}
            tabWidth={this.props.tabWidth}
          >
            {option.label}
            {this.renderLine(option.value)}
          </Tab>
        );
      })
    );
  }

  render() {
    return (
      <StyledTabSelector>
        {this.renderTabList()}
      </StyledTabSelector>
    );
  }
}

const Highlight = styled.div`
  width: 80%;
  height: 1px;
  margin-top: 5px;
  background: #949EFFcc;

  opacity: 0;
  animation: lineEnter 0.5s 0s;
  animation-fill-mode: forwards;
  @keyframes lineEnter {
    from { width: 0%; opacity: 0; }
    to   { width: 80%; opacity: 1; }
  }
`; 

const Tab = styled.div`
  height: 30px;
  width: ${(props: { tabWidth: string }) => props.tabWidth ? props.tabWidth : ''};
  padding: 0 10px;
  margin-right: 12px;
  display: flex;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  user-select: none;
  color: #949effcc;
  flex-direction: column;
  padding-top: 7px;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
  border-radius: 5px;
  
  :hover {
    background: #949EFF22;
  }
`;

const StyledTabSelector = styled.div`
  display: flex;
  align-items: center;
`;