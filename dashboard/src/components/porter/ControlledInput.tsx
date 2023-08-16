import React from "react";
import styled from "styled-components";
import Tooltip from "./Tooltip";

export const ControlledInput = React.forwardRef<
  HTMLInputElement,
  {
    id: string;
    name: string;
    label?: string;
    type: React.HTMLInputTypeAttribute;
    autoComplete: string;
    placeholder?: string;
    defaultValue?: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onBlur: React.FocusEventHandler<HTMLInputElement>;
    width?: string;
    height?: string;
    error?: string;
    disabled?: boolean;
    disabledTooltip?: string;
  }
>(
  (
    {
      id,
      name,
      label,
      type,
      autoComplete,
      placeholder,
      defaultValue,
      onChange,
      onBlur,
      width,
      height,
      error,
      disabled,
      disabledTooltip,
    },
    ref
  ) => {
    return disabled && disabledTooltip ? (
      <Tooltip content={disabledTooltip} position="right">
        <Block width={width}>
          {label && <Label>{label}</Label>}
          <StyledInput
            id={id}
            name={name}
            type={type}
            autoComplete={autoComplete}
            placeholder={placeholder}
            defaultValue={defaultValue}
            onChange={onChange}
            onBlur={onBlur}
            ref={ref}
            disabled={disabled}
            width={width}
            height={height}
            hasError={(error && true) || error === ""}
          />
          {error && (
            <Error>
              <i className="material-icons">error</i>
              {error}
            </Error>
          )}
        </Block>
      </Tooltip>
    ) : (
      <Block width={width}>
        {label && <Label>{label}</Label>}
        <StyledInput
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          ref={ref}
          disabled={disabled}
          width={width}
          height={height}
          hasError={(error && true) || error === ""}
        />
        {error && (
          <Error>
            <i className="material-icons">error</i>
            {error}
          </Error>
        )}
      </Block>
    );
  }
);

ControlledInput.displayName = "ControlledInput";

const Block = styled.div<{
  width?: string;
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
  hasError: boolean;
  width?: string;
  height?: string;
  disabled?: boolean;
}>`
  height: ${(props) => props.height || "35px"};
  padding: 5px 10px;
  width: ${(props) => props.width || "200px"};
  color: ${(props) => (props.disabled ? "#aaaabb" : "#ffffff")};
  font-size: 13px;
  outline: none;
  border-radius: 5px;
  background: #26292e;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "")};
  border: 1px solid ${(props) => (props.hasError ? "#ff3b62" : "#494b4f")};
  ${(props) =>
    !props.disabled &&
    `
      :hover {
        border: 1px solid ${props.hasError ? "#ff3b62" : "#7a7b80"};
      }
    `}
`;
