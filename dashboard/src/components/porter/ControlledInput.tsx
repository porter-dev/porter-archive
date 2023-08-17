import React from "react";
import styled from "styled-components";
import Tooltip from "./Tooltip";

/*
 *
 * ControlledInput is a wrapper around an input that allows for
 * onChange and onBlur handlers to be passed in by the higher level form component.
 * This is particular useful if using the "register" method from react-hook-form
 *
 */
export const ControlledInput = React.forwardRef<
  HTMLInputElement,
  {
    name: string; // name is the name attribute of the input
    label?: string; // label is used to render a label above the input. If not provided, no label is rendered
    type: React.HTMLInputTypeAttribute; // type is the type attribute of the input (text, password, etc.)
    placeholder?: string; // placeholder is the placeholder attribute of the input. If not provided, no placeholder is rendered
    defaultValue?: string; // defaultValue is the default value of the input. If not provided, the input is empty by default
    onChange: React.ChangeEventHandler<HTMLInputElement>; // onChange is the onChange handler of the input, called when the input value changes
    onBlur: React.FocusEventHandler<HTMLInputElement>; // onBlur is the onBlur handler of the input, called when the input loses focus
    autoComplete?: string; // autoComplete is the autoComplete attribute of the input. If not provided, no autoComplete is rendered
    width?: string; // width is the width of the input. If not provided, the width is 200px by default
    height?: string; // height is the height of the input. If not provided, the height is 35px by default
    error?: string; // error is the error message to display below the input. If not provided, no error is rendered
    disabled?: boolean; // disabled is whether or not the input is disabled. If not provided, the input is not disabled by default
    disabledTooltip?: string; // disabledTooltip is the tooltip to display when hovering over the input if it is disabled. If not provided, no tooltip is rendered
  }
>(
  (
    {
      name,
      label,
      type,
      autoComplete = "off",
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
