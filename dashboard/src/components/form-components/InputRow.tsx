import React, { ChangeEvent, Component } from "react";
import Tooltip from "@material-ui/core/Tooltip";
import styled from "styled-components";

type PropsType = {
  label?: string;
  info?: string;
  type: string;
  value: string | number;
  setValue?: (x: string | number) => void;
  unit?: string;
  placeholder?: string;
  width?: string;
  disabled?: boolean;
  isRequired?: boolean;
  className?: string;
  maxLength?: number;
  hasError?: boolean;
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
    let { label, value, type, unit, placeholder, width, info } = this.props;
    return (
      <StyledInputRow className={this.props.className}>
        {(label || info) && (
          <Label>
            {label}
            {info && (
              <Tooltip
                title={
                  <div
                    style={{
                      fontFamily: "Work Sans, sans-serif",
                      fontSize: "12px",
                      fontWeight: "normal",
                      padding: "5px 6px",
                    }}
                  >
                    {info}
                  </div>
                }
                placement="top"
              >
                <StyledInfoTooltip>
                  <i className="material-icons">help_outline</i>
                </StyledInfoTooltip>
              </Tooltip>
            )}
            {this.props.isRequired && <Required>{" *"}</Required>}
          </Label>
        )}
        <InputWrapper hasError={this.props.hasError} width={width}>
          <Input
            readOnly={this.state.readOnly}
            onFocus={() => this.setState({ readOnly: false })}
            disabled={this.props.disabled}
            placeholder={placeholder}
            width={width}
            type={type}
            value={value}
            onChange={this.handleChange}
            maxLength={this.props.maxLength}
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
  padding: 0 10px;
  background: #ffffff05;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #ffffff55;
`;

const InputWrapper = styled.div`
  display: flex;
  margin-bottom: -1px;
  align-items: center;
  border: 1px solid
    ${(props: { width: string; hasError: boolean }) =>
      props.hasError ? "red" : "#ffffff55"};
  border-radius: 3px;
  ${(props: { width: string; hasError: boolean }) => {
    if (props.width) {
      return `width:${props.width};`;
    }
  }}
`;

const Input = styled.input<{ disabled: boolean; width: string }>`
  outline: none;
  border: none;
  font-size: 13px;
  background: #ffffff11;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "")};
  width: ${(props) => (props.width ? props.width : "100%")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
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

const StyledInfoTooltip = styled.div`
  display: inline-block;
  position: relative;
  margin-right: 2px;
  > i {
    display: flex;
    align-items: center;
    position: absolute;
    top: -10px;
    font-size: 10px;
    color: #858faaaa;
    cursor: pointer;
    :hover {
      color: #aaaabb;
    }
  }
`;
