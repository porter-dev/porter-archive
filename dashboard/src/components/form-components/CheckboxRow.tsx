import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  label: string;
  checked: boolean;
  toggle: () => void;
  isRequired?: boolean;
  disabled?: boolean;
  wrapperStyles?: {
    disableMargin?: boolean;
  };
};

type StateType = {};

export default class CheckboxRow extends Component<PropsType, StateType> {
  render() {
    return (
      <StyledCheckboxRow
        disableMargin={this.props.wrapperStyles?.disableMargin}
      >
        <CheckboxWrapper
          disabled={this.props.disabled}
          onClick={!this.props.disabled ? this.props.toggle : undefined}
        >
          <Checkbox checked={this.props.checked}>
            <i className="material-icons">done</i>
          </Checkbox>
          {this.props.label}
          {this.props.isRequired && <Required>*</Required>}
        </CheckboxWrapper>
      </StyledCheckboxRow>
    );
  }
}

const Required = styled.section`
  margin-left: 8px;
  color: #fc4976;
`;

const CheckboxWrapper = styled.div<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  font-size: 13px;
  :hover {
    > div {
      background: #ffffff22;
    }
  }
`;

const Checkbox = styled.div<{ checked: boolean }>`
  width: 12px;
  height: 12px;
  border: 1px solid #ffffff55;
  margin: 1px 10px 0px 1px;
  border-radius: 3px;
  background: ${(props) => (props.checked ? "#ffffff22" : "#ffffff11")};
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props) => (props.checked ? "" : "none")};
  }
`;

const StyledCheckboxRow = styled.div<{ disableMargin?: boolean }>`
  display: flex;
  align-items: center;
  ${({ disableMargin }) => {
    if (disableMargin) {
      return "";
    }
    return `
      margin-bottom: 15px;
      margin-top: 20px;
    `;
  }}
`;
