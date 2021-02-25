import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  onRequestClose: () => void;
  width?: string;
  height?: string;
};

type StateType = {};

export default class Modal extends Component<PropsType, StateType> {
  wrapperRef: any = React.createRef();

  componentDidMount() {
    document.addEventListener("mousedown", this.handleClickOutside.bind(this));
  }

  componentWillUnmount() {
    document.removeEventListener(
      "mousedown",
      this.handleClickOutside.bind(this)
    );
  }

  handleClickOutside = (event: any) => {
    if (
      this.wrapperRef &&
      this.wrapperRef.current &&
      !this.wrapperRef.current.contains(event.target)
    ) {
      this.props.onRequestClose();
    }
  };

  render() {
    let { width, height } = this.props;
    return (
      <Overlay>
        <StyledModal ref={this.wrapperRef} width={width} height={height}>
          {this.props.children}
        </StyledModal>
      </Overlay>
    );
  }
}

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

const StyledModal = styled.div`
  position: absolute;
  width: ${(props: { width?: string; height?: string }) =>
    props.width ? props.width : "760px"};
  max-width: 80vw;
  height: ${(props: { width?: string; height?: string }) =>
    props.height ? props.height : "425px"};
  border-radius: 7px;
  border: 0;
  background-color: #202227;
  overflow: visible;
  padding: 25px 32px;
  animation: floatInModal 0.5s 0s;
  @keyframes floatInModal {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
