import React, { ChangeEvent, Component } from "react";
import styled from "styled-components";

type PropsType = {
  label?: string;
  type: string;
  value: string | number;
  setValue?: (x: string | number) => void;
  unit?: string;
  placeholder?: string;
  width?: string;
  disabled?: boolean;
  isRequired?: boolean;
};

type StateType = {
  readOnly: boolean;
};

export default class InputRow extends Component<PropsType, StateType> {
  state = {
    readOnly: true,
  };

  handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (this.props.type === "number") {
      this.props.setValue(parseFloat(e.target.value));
    } else {
      this.props.setValue(e.target.value);
    }
  };

  render() {
    let { label, value, type, unit, placeholder, width } = this.props;
    return (
      <StyledInputRow>
        <Label>
          {label} <Required>{this.props.isRequired ? " *" : null}</Required>
        </Label>
        <InputWrapper>
          <Input
            readOnly={this.state.readOnly}
            onFocus={() => this.setState({ readOnly: false })}
            disabled={this.props.disabled}
            placeholder={placeholder}
            width={width}
            type={type}
            value={value}
            onChange={this.handleChange}
          />
          {unit ? <Unit>{unit}</Unit> : null}
        </InputWrapper>
      </StyledInputRow>
    );
  }
}

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
`;

const Unit = styled.div`
  margin-left: 8px;
`;

const InputWrapper = styled.div`
  display: flex;
  margin-bottom: -1px;
  align-items: center;
`;

const Input = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { disabled: boolean; width: string }) =>
    props.width ? props.width : "270px"};
  color: ${(props: { disabled: boolean; width: string }) =>
    props.disabled ? "#ffffff44" : "white"};
  padding: 5px 10px;
  height: 35px;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const StyledInputRow = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;
