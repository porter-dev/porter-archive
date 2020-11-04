import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
  label: string,
  type: string,
  value: string | number,
  unit?: string
};

type StateType = {
};

export default class InputRow extends Component<PropsType, StateType> {
  render() {
    return (
      <StyledInputRow>
        <Label>{this.props.label}</Label>
        <InputWrapper>
          <Input type={this.props.type} />
          <Unit>{this.props.unit}</Unit>
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
  width: 270px;
  color: white;
  padding: 5px 8px;
  margin-right: 8px;
  height: 30px;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledInputRow = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;