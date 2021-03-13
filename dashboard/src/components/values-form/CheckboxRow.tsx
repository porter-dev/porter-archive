import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  label: string;
  checked: boolean;
  toggle: () => void;
  required?: boolean;
};

type StateType = {};

export default class CheckboxRow extends Component<PropsType, StateType> {
  render() {
    return (
      <StyledCheckboxRow>
        <CheckboxWrapper onClick={this.props.toggle}>
          <Checkbox checked={this.props.checked}>
            <i className="material-icons">done</i>
          </Checkbox>
          {this.props.label}
          {this.props.required && <Required>*</Required>}
        </CheckboxWrapper>
      </StyledCheckboxRow>
    );
  }
}

const Required = styled.section`
  margin-left: 8px;
  color: #fc4976;
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  :hover {
    > div {
      background: #ffffff22;
    }
  }
`;

const Checkbox = styled.div`
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff55;
  margin: 1px 10px 0px 1px;
  border-radius: 3px;
  background: ${(props: { checked: boolean }) =>
    props.checked ? "#ffffff22" : "#ffffff11"};
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props: { checked: boolean }) => (props.checked ? "" : "none")};
  }
`;

const StyledCheckboxRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  margin-top: 20px;
`;
