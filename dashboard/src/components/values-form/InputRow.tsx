import React, { ChangeEvent, Component } from 'react';
import styled from 'styled-components';

type PropsType = {
  label?: string,
  type: string,
  value: string | number,
  setValue: (x: string) => void,
  unit?: string
  placeholder?: string
  width?: string
  disabled?: boolean
};

type StateType = {
};

export default class InputRow extends Component<PropsType, StateType> {
  render() {
    let { label, value, type, unit, placeholder, width } = this.props;
    return (
      <StyledInputRow>
        <Label>{label}</Label>
        <InputWrapper>
          <Input
            disabled={this.props.disabled}
            placeholder={placeholder}
            width={width}
            type={type}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              this.props.setValue(e.target.value)
            }
          />
          <Unit>{unit}</Unit>
        </InputWrapper>
      </StyledInputRow>
    );
  }
}

const Unit = styled.div`

`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { disabled: boolean, width: string }) => props.width ? props.width : '270px'};
  color: ${(props: { disabled: boolean, width: string }) => props.disabled ? '#ffffff44' : 'white'};
  padding: 5px 8px;
  margin-right: 8px;
  height: 30px;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
`;

const StyledInputRow = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;