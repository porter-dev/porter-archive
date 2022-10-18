import React, { Component } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";

type Props = {
  text?: string;
  onClick: () => void;
  disabled?: boolean;
  status?: string | null;
  color?: string;
  rounded?: boolean;
  helper?: string | null;
  saveText?: string | null;

  // Makes flush with corner if not within a modal
  makeFlush?: boolean;
  clearPosition?: boolean;
  statusPosition?: "right" | "left";
  // Provide the classname to modify styles from other components
  className?: string;
  successText?: string;
};

const SaveButton: React.FC<Props> = (props) => {
  const renderStatus = () => {
    if (props.status) {
      if (props.status === "successful") {
        return (
          <StatusWrapper position={props.statusPosition} successful={true}>
            <i className="material-icons">done</i>
            <StatusTextWrapper>
              {props?.successText || "Successfully updated"}
            </StatusTextWrapper>
          </StatusWrapper>
        );
      } else if (props.status === "loading") {
        return (
          <StatusWrapper position={props.statusPosition} successful={false}>
            <LoadingGif src={loading} />
            <StatusTextWrapper>
              {props.saveText || "Updating . . ."}
            </StatusTextWrapper>
          </StatusWrapper>
        );
      } else if (props.status === "error") {
        return (
          <StatusWrapper position={props.statusPosition} successful={false}>
            <i className="material-icons">error_outline</i>
            <StatusTextWrapper>Could not update</StatusTextWrapper>
          </StatusWrapper>
        );
      } else {
        return (
          <StatusWrapper position={props.statusPosition} successful={false}>
            <i className="material-icons">error_outline</i>
            <StatusTextWrapper>{props.status}</StatusTextWrapper>
          </StatusWrapper>
        );
      }
    } else if (props.helper) {
      return (
        <StatusWrapper position={props.statusPosition} successful={true}>
          {props.helper}
        </StatusWrapper>
      );
    }
  };

  return (
    <ButtonWrapper
      makeFlush={props.makeFlush}
      clearPosition={props.clearPosition}
      className={props.className}
    >
      {props.statusPosition !== "right" && <div>{renderStatus()}</div>}
      <Button
        rounded={props.rounded}
        disabled={props.disabled}
        onClick={props.onClick}
        color={props.color || "#5561C0"}
      >
        {props.children || props.text}
      </Button>
      {props.statusPosition === "right" && <div>{renderStatus()}</div>}
    </ButtonWrapper>
  );
};

export default SaveButton;

const LoadingGif = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 9px;
  margin-bottom: 0px;
`;

const StatusTextWrapper = styled.p`
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 19px;
  margin: 0;
`;

// TODO: prevent status re-render on form refresh to allow animation
// animation: statusFloatIn 0.5s;
const StatusWrapper = styled.div<{
  successful: boolean;
  position: "right" | "left";
}>`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  ${(props) => {
    if (props.position !== "right") {
      return "margin-right: 25px;";
    }
    return "margin-left: 25px;";
  }}
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;

  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: ${(props) => (props.successful ? "#4797ff" : "#fcba03")};
  }

  animation-fill-mode: forwards;

  @keyframes statusFloatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const ButtonWrapper = styled.div`
  ${(props: { makeFlush: boolean; clearPosition?: boolean }) => {
    const baseStyles = `
      display: flex;
      align-items: center;
      z-index: 99;
    `;

    if (props.clearPosition) {
      return baseStyles;
    }

    if (!props.makeFlush) {
      return `
        ${baseStyles}
        position: absolute;
        justify-content: flex-end;
        bottom: 25px;
        right: 27px;
        left: 27px;
      `;
    }
    return `
      ${baseStyles}
      position: absolute;
      justify-content: flex-end;
      bottom: 5px;
      right: 0;
    `;
  }}
`;

const Button = styled.button<{
  disabled: boolean;
  color: string;
  rounded: boolean;
}>`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: ${(props) => (props.rounded ? "100px" : "5px")};
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 10px;
    margin-left: -5px;
    justify-content: center;
  }
`;
