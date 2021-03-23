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
};

type StateType = {};

export default class SaveButton extends Component<PropsType, StateType> {
  renderStatus = () => {
    if (this.props.status) {
      if (this.props.status === "successful") {
        return (
          <StatusWrapper successful={true}>
            <i className="material-icons">done</i> Successfully updated
          </StatusWrapper>
        );
      } else if (this.props.status === "loading") {
        return (
          <StatusWrapper successful={false}>
            <LoadingGif src={loading} /> Updating . . .
          </StatusWrapper>
        );
      } else if (this.props.status === "error") {
        return (
          <StatusWrapper successful={false}>
            <i className="material-icons">error_outline</i> Could not update
          </StatusWrapper>
        );
      } else {
        return (
          <StatusWrapper successful={false}>
            <i className="material-icons">error_outline</i> {this.props.status}
          </StatusWrapper>
        );
      }
    } else if (this.props.helper) {
      return (
        <StatusWrapper successful={true}>{this.props.helper}</StatusWrapper>
      );
    }
  };

  render() {
    return (
      <ButtonWrapper makeFlush={this.props.makeFlush}>
        {this.renderStatus()}
        <Button
          disabled={this.props.disabled}
          onClick={this.props.onClick}
          color={this.props.color || "#616FEEcc"}
        >
          {this.props.text}
        </Button>
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

const StatusWrapper = styled.div`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-right: 25px;

  > i {
    font-size: 18px;
    margin-right: 10px;
    color: ${(props: { successful: boolean }) =>
      props.successful ? "#4797ff" : "#fcba03"};
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
  display: flex;
  align-items: center;
  position: absolute;
  ${(props: { makeFlush: boolean }) => {
    if (!props.makeFlush) {
      return `
        bottom: 25px;
        right: 27px;
      `;
    }
    return `
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
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${props => (!props.disabled ? props.color : "#aaaabb")};
  box-shadow: ${props => (!props.disabled ? "0 2px 5px 0 #00000030" : "none")};
  cursor: ${props => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${props => (!props.disabled ? "brightness(120%)" : "")};
  }
`;
