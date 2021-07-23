import React, { Component } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";

type PropsType = {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  status?: string | null;
  color?: string;
  helper?: string | null;

  // Makes flush with corner if not within a modal
  makeFlush?: boolean;
  clearPosition?: boolean;
  statusPosition?: "right" | "left";
};

type StateType = {};

export default class SaveButton extends Component<PropsType, StateType> {
  renderStatus = () => {
    if (this.props.status) {
      if (this.props.status === "successful") {
        return (
          <StatusWrapper position={this.props.statusPosition} successful={true}>
            <i className="material-icons">done</i>
            <StatusTextWrapper>Successfully updated</StatusTextWrapper>
          </StatusWrapper>
        );
      } else if (this.props.status === "loading") {
        return (
          <StatusWrapper
            position={this.props.statusPosition}
            successful={false}
          >
            <LoadingGif src={loading} />
            <StatusTextWrapper>Updating . . .</StatusTextWrapper>
          </StatusWrapper>
        );
      } else if (this.props.status === "error") {
        return (
          <StatusWrapper
            position={this.props.statusPosition}
            successful={false}
          >
            <i className="material-icons">error_outline</i>
            <StatusTextWrapper>Could not update</StatusTextWrapper>
          </StatusWrapper>
        );
      } else {
        return (
          <StatusWrapper
            position={this.props.statusPosition}
            successful={false}
          >
            <i className="material-icons">error_outline</i>
            <StatusTextWrapper>{this.props.status}</StatusTextWrapper>
          </StatusWrapper>
        );
      }
    } else if (this.props.helper) {
      return (
        <StatusWrapper position={this.props.statusPosition} successful={true}>
          {this.props.helper}
        </StatusWrapper>
      );
    }
  };

  render() {
    return (
      <ButtonWrapper
        makeFlush={this.props.makeFlush}
        clearPosition={this.props.clearPosition}
      >
        {this.props.statusPosition !== "right" && (
          <div>{this.renderStatus()}</div>
        )}
        <Button
          disabled={this.props.disabled}
          onClick={this.props.onClick}
          color={this.props.color || "#616FEEcc"}
        >
          {this.props.text}
        </Button>
        {this.props.statusPosition === "right" && (
          <div>{this.renderStatus()}</div>
        )}
      </ButtonWrapper>
    );
  }
}

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

  animation: statusFloatIn 0.5s;
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

const Button = styled.button`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  flex: 0 0 auto;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  box-shadow: ${(props) =>
    !props.disabled ? "0 2px 5px 0 #00000030" : "none"};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;
