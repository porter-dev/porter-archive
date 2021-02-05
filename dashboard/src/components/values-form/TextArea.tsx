import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  label?: string;
  value: string;
  setValue: (x: string) => void;
  placeholder?: string;
  width?: string;
  disabled?: boolean;
};

type StateType = {};

export default class TextArea extends Component<PropsType, StateType> {
  handleChange = (e: any) => {
    this.props.setValue(e.target.value);
  };

  render() {
    let { label, value, placeholder, width } = this.props;
    return (
      <StyledTextArea>
        <Label>{label}</Label>
        <InputArea
          disabled={this.props.disabled}
          placeholder={placeholder}
          width={width}
          value={value || ""}
          onChange={this.handleChange}
        />
      </StyledTextArea>
    );
  }
}

const InputArea = styled.textarea`
  outline: none;
  border: none;
  resize: none;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { disabled: boolean; width: string }) =>
    props.width ? props.width : "270px"};
  color: ${(props: { disabled: boolean; width: string }) =>
    props.disabled ? "#ffffff44" : "white"};
  padding: 5px 10px;
  margin-right: 8px;
  height: 8em;
  line-height: 1.6em;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const StyledTextArea = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;
