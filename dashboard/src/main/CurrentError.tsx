import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";

import { Context } from "shared/Context";

type PropsType = {
  currentError: string;
};

type StateType = {};

export default class CurrentError extends Component<PropsType, StateType> {
  state = {
    expanded: false
  };

  componentDidUpdate(prevProps: PropsType) {
    if (
      prevProps.currentError !== this.props.currentError &&
      this.props.currentError ===
        "Provisioning failed. Check your credentials and try again."
    ) {
      this.setState({ expanded: true });
    }
  }

  render() {
    if (this.props.currentError) {
      if (!this.state.expanded) {
        return (
          <StyledCurrentError onClick={() => this.setState({ expanded: true })}>
            <ErrorText>Error: {this.props.currentError}</ErrorText>
            <CloseButton
              onClick={e => {
                this.context.setCurrentError(null);
                e.stopPropagation();
              }}
            >
              <CloseButtonImg src={close} />
            </CloseButton>
          </StyledCurrentError>
        );
      }

      return (
        <ExpandedError onClick={() => this.setState({ expanded: false })}>
          Error: {this.props.currentError}
          <CloseButtonAlt onClick={() => this.context.setCurrentError(null)}>
            <CloseButtonImg src={close} />
          </CloseButtonAlt>
        </ExpandedError>
      );
    }

    return null;
  }
}

CurrentError.contextType = Context;

const CloseButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-left: 10px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonAlt = styled(CloseButton)`
  position: absolute;
  top: 5px;
  right: 5px;
`;

const CloseButtonImg = styled.img`
  width: 10px;
`;

const ErrorText = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: calc(100% - 50px);
`;

const StyledCurrentError = styled.div`
  position: fixed;
  bottom: 22px;
  width: 300px;
  left: 20px;
  padding: 15px;
  padding-right: 0px;
  font-family: "Work Sans", sans-serif;
  height: 50px;
  font-size: 13px;
  border-radius: 3px;
  background: #272731cc;
  border: 1px solid #ffffff55;
  display: flex;
  align-items: center;
  color: #ffffff;

  > i {
    font-size: 18px;
    margin-right: 10px;
  }

  animation: floatIn 0.5s;
  animation-fill-mode: forwards;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const ExpandedError = styled(StyledCurrentError)`
  width: 500px;
  height: auto;
  max-height: 300px;
  padding: 20px;
  overflow-y: auto;
`;
