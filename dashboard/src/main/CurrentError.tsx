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
    expanded: false,
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
    let currentError = this.props.currentError;
    if (!React.isValidElement(this.props.currentError)) {
      currentError = String(this.props.currentError);
    }
    if (this.props.currentError) {
      if (!this.state.expanded) {
        return (
          <StyledCurrentError>
            <ErrorText>Error: {currentError}</ErrorText>
            <ExpandButton onClick={() => this.setState({ expanded: true })}>
              <i className="material-icons">launch</i>
            </ExpandButton>
            <CloseButton
              onClick={(e) => {
                e.stopPropagation();

                this.setState({ expanded: false }, () => {
                  this.context.setCurrentError(null);
                });
              }}
            >
              <CloseButtonImg src={close} />
            </CloseButton>
          </StyledCurrentError>
        );
      }

      return (
        <Overlay>
          <ExpandedError>
            Porter encountered an error. Full error log:
            <CodeBlock>{currentError}</CodeBlock>
            <ExpandButtonAlt onClick={() => this.setState({ expanded: false })}>
              <i className="material-icons">remove</i>
            </ExpandButtonAlt>
            <CloseButtonAlt
              onClick={(e) => {
                e.stopPropagation();

                this.setState({ expanded: false }, () => {
                  this.context.setCurrentError(null);
                });
              }}
            >
              <CloseButtonImg src={close} />
            </CloseButtonAlt>
          </ExpandedError>
        </Overlay>
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
  width: calc(100% - 80px);
`;

const StyledCurrentError = styled.div`
  position: fixed;
  bottom: 22px;
  width: 310px;
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

const ExpandButton = styled(CloseButton)`
  display: flex;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;

  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 16px;
  }
`;

const ExpandButtonAlt = styled(ExpandButton)`
  position: absolute;
  top: 5px;
  right: 34px;
`;

const Overlay = styled.div`
  position: fixed;
  margin: 0;
  padding: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ExpandedError = styled.div`
  position: fixed;
  display: block;
  width: 700px;
  left: calc(50% - 350px);
  height: auto;
  max-height: 500px;
  top: 50%;
  transform: translateY(-50%);
  padding: 20px;
  overflow-y: auto;
  background: #272731;
  border: 1px solid #ffffff55;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  border-radius: 12px;
`;

const CodeBlock = styled.span`
  display: block;
  background-color: #1b1d26;
  color: white;
  border-radius: 5px;
  font-family: monospace;
  user-select: text;
  max-height: 400px;
  width: 90%;
  margin-left: 5%;
  margin-top: 20px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 10px;
  overflow-wrap: break-word;
`;
