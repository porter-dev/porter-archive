import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

import loading from "assets/loading.gif";
import Tooltip from "./Tooltip";

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  status?: React.ReactNode;
  helperText?: string;
  loadingText?: string;
  errorText?: string;
  successText?: string;
  width?: string;
  height?: string;
  color?: string;
  withBorder?: boolean;
  rounded?: boolean;
  alt?: boolean;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabledTooltipMessage?: string;
  disabledTooltipPosition?: "top" | "right" | "bottom" | "left";
};

const Button: React.FC<Props> = ({
  children,
  onClick,
  disabled,
  status,
  helperText,
  loadingText,
  errorText,
  successText,
  width,
  height,
  color,
  withBorder,
  rounded,
  alt,
  type = "button",
  disabledTooltipMessage,
  disabledTooltipPosition = "right",
}) => {
  const renderStatus = () => {
    switch (status) {
      case "success":
        return (
          <StatusWrapper success={true}>
            <i className="material-icons">done</i>
            {successText || "Successfully updated"}
          </StatusWrapper>
        );
      case "loading":
        return (
          <StatusWrapper success={false}>
            <Loading src={loading} />
            {loadingText || "Updating . . ."}
          </StatusWrapper>
        );
      case "error":
        return (
          <StatusWrapper success={false}>
            <i className="material-icons">error_outline</i>
            {errorText}
          </StatusWrapper>
        );
      case "":
        return (
          helperText && (
            <StatusWrapper success={false}>{helperText}</StatusWrapper>
          )
        );
      default:
        return <StatusWrapper success={false}>{status}</StatusWrapper>;
    }
  };

  return disabled && disabledTooltipMessage ? (
    <Tooltip content={disabledTooltipMessage} position={disabledTooltipPosition}>
      <Wrapper>
        <StyledButton
          disabled={disabled}
          onClick={() => {
            if (!disabled && onClick) {
              onClick();
            }
          }}
          width={width}
          height={height}
          color={color}
          withBorder={withBorder || alt}
          rounded={rounded || alt}
          alt={alt}
          type={type}
        >
          <Text>{children}</Text>
        </StyledButton>
        {(helperText || status) && renderStatus()}
      </Wrapper>
    </Tooltip>
  ) : (
    <Wrapper>
      <StyledButton
        disabled={disabled}
        onClick={() => {
          if (!disabled && onClick) {
            onClick();
          }
        }}
        width={width}
        height={height}
        color={color}
        withBorder={withBorder || alt}
        rounded={rounded || alt}
        alt={alt}
        type={type}
      >
        <Text>{children}</Text>
      </StyledButton>
      {(helperText || status) && renderStatus()}
    </Wrapper>
  );
};

export default Button;

const Loading = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 9px;
  margin-bottom: 0px;
`;

const floatIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0px);
  }
`;

const StatusWrapper = styled.div<{
  success?: boolean;
}>`
  display: flex;
  line-height: 1.5;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-left: 15px;
  text-overflow: ellipsis;
  animation: ${floatIn} 0.5s;
  animation-fill-mode: forwards;
  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: ${(props) => (props.success ? "#4797ff" : "#fcba03")};
  }
`;

const Wrapper = styled.div`
  display: flex;
`;

const Text = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
`;

const StyledButton = styled.button<{
  disabled?: boolean;
  width?: string;
  height?: string;
  color?: string;
  withBorder?: boolean;
  rounded?: boolean;
  alt?: boolean;
}>`
  height: ${(props) => props.height || "35px"};
  width: ${(props) => props.width || "auto"};
  min-width: ${(props) => props.width || ""};
  font-size: 13px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  padding: 15px;
  border: none;
  outline: none;
  color: white;
  opacity: ${(props) => (props.disabled && props.withBorder ? "0.5" : "1")};
  background: ${(props) => {
    if (props.alt || props.color === "fg") {
      return props.theme.fg;
    }
    return props.disabled
      ? "#aaaabb"
      : props.color || props.theme.button;
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${(props) => (props.rounded ? "50px" : "5px")};
  border: ${(props) => (props.withBorder ? "1px solid #494b4f" : "none")};

  :hover {
    filter: ${(props) => (props.disabled ? "" : "brightness(120%)")};
  }
`;
