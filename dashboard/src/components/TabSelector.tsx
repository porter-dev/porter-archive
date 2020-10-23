import React, { Component } from 'react';
import styled from 'styled-components';

export interface selectOption {
  value: string,
  label: string
}

type PropsType = {
  currentTab: string,
  options: selectOption[],
  setCurrentTab: (value: string) => void,
  addendum?: any
};

type StateType = {
};

export default class TabSelector extends Component<PropsType, StateType> {
  handleTabClick = (value: string) => {
    this.props.setCurrentTab(value);
  }

  renderTabList = () => {
    return (
      this.props.options.map((option: selectOption, i: number) => {
        return (
          <Tab
            key={i}
            onClick={() => this.handleTabClick(option.value)}
            lastItem={i === this.props.options.length - 1}
            highlight={option.value === this.props.currentTab}
          >
            {option.label}
          </Tab>
        );
      })
    );
  }

  render() {
    return (
      <StyledTabSelector>
        {this.renderTabList()}
        {this.props.addendum}
      </StyledTabSelector>
    );
  }
}

const Highlight = styled.div`
  width: 80%;
  height: 1px;
  margin-top: 5px;
  background: #949EFFcc00;

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
  margin-right: ${(props: { lastItem: boolean, highlight: boolean }) => props.lastItem ? '' : '30px'};
  display: flex;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  user-select: none;
  color: ${(props: { lastItem: boolean, highlight: boolean }) => props.highlight ? '#949effcc' : '#aaaabb55'};
  flex-direction: column;
  padding-top: 7px;
  padding-bottom: 2px;
  margin-bottom: -2px;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 1px solid ${(props: { lastItem: boolean, highlight: boolean }) => props.highlight ? '#949effcc' : 'none'};
  :hover {
    color: ${(props: { lastItem: boolean, highlight: boolean }) => props.highlight ? '' : '#aaaabb'};
  }
`;

const StyledTabSelector = styled.div`
  display: flex;
  width: calc(100% - 4px);
  align-items: center;
  border-bottom: 1px solid #aaaabb55;
  padding-bottom: 1px;
  margin-left: 2px;
  position: relative;
`;