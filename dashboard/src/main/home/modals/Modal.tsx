import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
  onRequestClose: () => void,
  width?: string,
  height?: string,
}

type StateType = {
}

export default class Modal extends Component<PropsType, StateType> {
  render() {
    let { width, height } = this.props;
    return (
      <Overlay>
        <StyledModal
          width={width}
          height={height}
        >
          {this.props.children}
        </StyledModal>
      </Overlay>
    );
  }
}

const Overlay = styled.div`
  position: absolute;
  margin: 0;
  padding: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.6);
  z-index: 3;
`;

const StyledModal = styled.div`
  position: absolute;
  top: calc(50% - (${(props: { width?: string, height?: string }) => props.height ? props.height : '425px'} / 2));
  left: calc(50% - (${(props: { width?: string, height?: string }) => props.width ? props.width : '760px'} / 2));
  display: flex;
  justify-content: center;
  width: ${(props: { width?: string, height?: string }) => props.width ? props.width : '760px'};
  max-width: 80vw;
  height: ${(props: { width?: string, height?: string }) => props.height ? props.height : '425px'};
  border-radius: 7px;
  border: 0;
  background-color: #202227;
  overflow: visible;
  padding: 25px 32px;
`;