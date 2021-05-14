import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  message: string;
  show: boolean;
  onYes: React.MouseEventHandler;
  onNo: React.MouseEventHandler;
};

type StateType = {};

export default class ConfirmOverlay extends Component<PropsType, StateType> {
  render() {
    if (this.props.show) {
      return (
        <StyledConfirmOverlay>
          {this.props.message}
          <ButtonRow>
            <ConfirmButton onClick={this.props.onYes}>Yes</ConfirmButton>
            <ConfirmButton onClick={this.props.onNo}>No</ConfirmButton>
          </ButtonRow>
        </StyledConfirmOverlay>
      );
    }
    return null;
  }
}

const StyledConfirmOverlay = styled.div`
  position: absolute;
  top: 0px;
  opacity: 100%;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 999;
  display: flex;
  padding-bottom: 30px;
  align-items: center;
  justify-content: center;
  font-family: "Work Sans", sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: white;
  flex-direction: column;
  background: rgb(0, 0, 0, 0.73);
  opacity: 0;
  animation: lindEnter 0.2s;
  animation-fill-mode: forwards;

  @keyframes lindEnter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 180px;
  margin-top: 30px;
`;

const ConfirmButton = styled.div`
  font-size: 18px;
  padding: 10px 15px;
  outline: none;
  border: 1px solid white;
  border-radius: 10px;
  text-align: center;
  width: 80px;
  cursor: pointer;
  opacity: 0;
  font-family: "Work Sans", sans-serif;
  font-size: 18px;
  font-weight: 500;
  animation: linEnter 0.3s 0.1s;
  animation-fill-mode: forwards;
  @keyframes linEnter {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0px);
      opacity: 1;
    }
  }
  :hover {
    background: white;
    color: #232323;
  }
`;
