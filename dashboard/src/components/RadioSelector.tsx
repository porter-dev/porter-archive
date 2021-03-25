import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  selected: string;
  setSelected: (x: string) => void;
  options: { value: string; label: string }[];
};

type StateType = {};

export default class RadioSelector extends Component<PropsType, StateType> {
  render() {
    return (
      <StyledRadioSelector>
        {this.props.options.map(
          (option: { label: string; value: string }, i: number) => {
            let selected = option.value === this.props.selected;
            return (
              <RadioRow onClick={() => this.props.setSelected(option.value)}>
                <Indicator selected={selected}>
                  {selected && <Circle />}
                </Indicator>
                {option.label}
              </RadioRow>
            );
          }
        )}
      </StyledRadioSelector>
    );
  }
}

const RadioRow = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 12px;
  :hover {
    > div {
      background: #ffffff22;
    }
  }
`;

const Indicator = styled.div<{ selected: boolean }>`
  border-radius: 15px;
  display: flex;
  margin-right: 4px;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff55;
  margin: 1px 10px 0px 1px;
  background: ${props => (props.selected ? "#ffffff22" : "#ffffff11")};
`;

const Circle = styled.div`
  width: 8px;
  height: 8px;
  background: #ffffff55;
  border-radius: 15px;
`;

const StyledRadioSelector = styled.div``;
