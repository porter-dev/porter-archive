import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
  activeValue: string,
  options: { value: string, label: string }[],
  setActiveValue: (x: string) => void,
  dropdownLabel: string
};

type StateType = {
};

export default class Selector extends Component<PropsType, StateType> {
  state = {
    expanded: false
  }

  renderOptionList = () => {
    let { options, activeValue, setActiveValue } = this.props;
    return options.map((option: { value: string, label: string }, i: number) => {
      return (
        <Option
          key={i}
          selected={option.value === activeValue}
          onClick={() => setActiveValue(option.value)}
        >
          {option.label}
        </Option>
      );
    });
  }

  renderDropdown = () => {
    if (this.state.expanded) {
      return (
        <div>
          <CloseOverlay onClick={() => this.setState({ expanded: false })}/>
          <Dropdown>
            <DropdownLabel>
              {this.props.dropdownLabel}
            </DropdownLabel>
            {this.renderOptionList()}
          </Dropdown>
        </div>
      )
    }
  }

  render() {
    let { activeValue } = this.props;
    return (
      <StyledSelector>
        <MainSelector
          onClick={() => this.setState({ expanded: !this.state.expanded })}
          expanded={this.state.expanded}
        >
          <TextWrap>
            {activeValue === '' ? 'All' : activeValue}
          </TextWrap>
          <i className="material-icons">arrow_drop_down</i>
        </MainSelector>
        {this.renderDropdown()}
      </StyledSelector>
    );
  }
}

const TextWrap = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DropdownLabel = styled.div`
  font-size: 13px;
  color: #ffffff44;
  font-weight: 500;
  margin: 10px 13px;
`;

const Option = styled.div` 
  width: 100%;
  border-bottom: 1px solid #ffffff10;
  height: 35px;
  font-size: 13px;
  padding-top: 9px;
  align-items: center;
  padding-left: 15px;
  cursor: pointer;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${(props: { selected: boolean }) => props.selected ? '#ffffff11' : ''};

  :hover {
    background: #ffffff22;
  }
`;

const CloseOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 5px);
  background: #26282f;
  width: calc(100% + 80px);
  max-height: 300px;
  padding-bottom: 20px;
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  box-shadow: 0 8px 20px 0px #00000055;
`;

const StyledSelector = styled.div`
  position: relative;
`;

const MainSelector = styled.div`
  width: 150px;
  height: 30px;
  border: 1px solid #ffffff66;
  font-size: 13px;
  padding: 5px 10px;
  padding-left: 12px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: ${(props: { expanded: boolean }) => props.expanded ? '#ffffff33' : '#ffffff11'};

  :hover {
    background: ${(props: { expanded: boolean }) => props.expanded ? '#ffffff33' : '#ffffff22'};
  }

  > i {
    font-size: 20px;
    transform: ${(props: { expanded: boolean }) => props.expanded ? 'rotate(180deg)' : ''};
  }
`;