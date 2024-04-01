import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { boolean } from "zod";
import Tooltip from "./Tooltip";

type Props = {
  autoFocus?: boolean;
  placeholder: string;
  width?: string;
  value: string;
  setValue?: (value: string) => void;
  label?: string | React.ReactNode;
  height?: string;
  type?: string;
  error?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  disabledTooltip?: string;
  onValueChange?: (value: string) => void;
  hideCursor?: boolean;
};

const Input: React.FC<Props> = ({
  autoFocus,
  placeholder,
  width,
  value,
  setValue,
  label,
  height,
  type,
  error,
  children,
  disabled,
  disabledTooltip,
  onValueChange,
  hideCursor = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (onValueChange) {
      onValueChange(inputValue);
    } else {
      setValue(inputValue);
    }
  };
  return disabled && disabledTooltip ? (
    <Tooltip content={disabledTooltip} position="right">
      <Block width={width}>
        {label && <Label>{label}</Label>}
        <StyledInput
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          width={width}
          height={height}
          type={type || "text"}
          hasError={(error && true) || error === ""}
          disabled={disabled ? disabled : false}
          hideCursor={hideCursor}
        />
        {error && (
          <Error>
            <i className="material-icons">error</i>
            {error}
          </Error>
        )}
        {children}
      </Block>
    </Tooltip>
  ) : (
    <Block width={width}>
      {label && <Label>{label}</Label>}
      <StyledInput
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        width={width}
        height={height}
        type={type || "text"}
        hasError={(error && true) || error === ""}
        disabled={disabled ? disabled : false}
        hideCursor={hideCursor}
      />
      {error && (
        <Error>
          <i className="material-icons">error</i>
          {error}
        </Error>
      )}
      {children}
    </Block>
  );
};

export default Input;

const Block = styled.div<{
  width: string;
}>`
  display: block;
  position: relative;
  width: ${(props) => props.width || "200px"};
`;

const Label = styled.div`
  font-size: 13px;
  color: #aaaabb;
  margin-bottom: 10px;
`;

const Error = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #ff3b62;
  margin-top: 10px;

  > i {
    font-size: 18px;
    margin-right: 5px;
  }
`;

const StyledInput = styled.input<{
  width: string;
  height: string;
  hasError: boolean;
  disabled: boolean;
  hideCursor: boolean;
}>`
  height: ${(props) => props.height || "30px"};
  padding: 5px 10px;
  width: ${(props) => props.width || "200px"};
  color: ${(props) => (props.disabled ? "#aaaabb" : "#ffffff")};
  font-size: 13px;
  outline: none;
  border-radius: 5px;
  transition: all 0.2s;
  background: ${(props) => props.theme.fg};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "")};

  border: 1px solid ${(props) => (props.hasError ? "#ff3b62" : "#494b4f")};
  ${(props) =>
    !props.disabled &&
    `
    :hover {
      border: 1px solid ${props.hasError ? "#ff3b62" : "#7a7b80"};
    }
  `}
  ${(props) => props.hideCursor && "caret-color: transparent;"}
`;
