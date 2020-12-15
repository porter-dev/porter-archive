import React, { ChangeEvent, Component } from 'react';
import styled from 'styled-components';

type PropsType = {
  label?: string,
  type: string,
  value: string | number,
  setValue: (x: string | number) => void,
  unit?: string,
  placeholder?: string,
  width?: string,
  disabled?: boolean,
  isRequired?: boolean,
};

type StateType = {
  readOnly: boolean
};

export default class InputRow extends Component<PropsType, StateType> {
  state = {
    readOnly: true
  }

  handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (this.props.type === 'number') {
      this.props.setValue(parseInt(e.target.value));
    } else {
      this.props.setValue(e.target.value);
    }
  }

  renderRequiredWarning = () => {
    if (this.props.isRequired && this.props.value === '') {
      return (
        <Warning>
          <i className="material-icons">error_outline</i>
        </Warning>
      );
    }
  }
  
  render() {
    let { label, value, type, unit, placeholder, width } = this.props;
    return (
      <StyledInputRow>
        <Label>{label} {this.props.isRequired ? ' *' : null}</Label>
        <InputWrapper>
          <Input
            readOnly={this.state.readOnly} onFocus={() => this.setState({ readOnly: false })}
            disabled={this.props.disabled}
            placeholder={placeholder}
            width={width}
            type={type}
            value={value}
            onChange={this.handleChange}
          />
          {unit ? <Unit>{unit}</Unit> : null}
          {this.renderRequiredWarning()}
        </InputWrapper>
      </StyledInputRow>
    );
  }
}

const Unit = styled.div`
  margin-right: 8px;
`;

const Warning = styled.div`
  margin-bottom: -3px;
  > i {
    font-size: 18px;
    color: #fcba03;
  }
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
  padding: 5px 10px;
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