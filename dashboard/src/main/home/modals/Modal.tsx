import React, { Component } from "react";
import styled from "styled-components";
import ReactDOM from "react-dom";

type PropsType = {
  onRequestClose?: () => void;
  width?: string;
  height?: string;
  title?: string;
};

type StateType = {};

const modalRoot = document.getElementById("modal-root");

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
      this.props.onRequestClose &&
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
      <PortalModal>
        <Overlay>
          <StyledModal ref={this.wrapperRef} width={width} height={height}>
            {this.props.onRequestClose && (
              <CloseButton onClick={this.props.onRequestClose}>
                <i className="material-icons">close</i>
              </CloseButton>
            )}
            {this.props.title && <ModalTitle>{this.props.title}</ModalTitle>}
            {this.props.children}
          </StyledModal>
        </Overlay>
      </PortalModal>
    );
  }
}

export class PortalModal extends Component {
  el: Element;
  constructor(props: any) {
    super(props);
    this.el = document.createElement("div");
  }

  componentDidMount() {
    // The portal element is inserted in the DOM tree after
    // the Modal's children are mounted, meaning that children
    // will be mounted on a detached DOM node. If a child
    // component requires to be attached to the DOM tree
    // immediately when mounted, for example to measure a
    // DOM node, or uses 'autoFocus' in a descendant, add
    // state to Modal and only render the children when Modal
    // is inserted in the DOM tree.
    modalRoot.appendChild(this.el);
  }

  componentWillUnmount() {
    modalRoot.removeChild(this.el);
  }

  render() {
    return ReactDOM.createPortal(this.props.children, this.el);
  }
}

const ModalTitle = styled.div`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 10px;
  user-select: none;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 20px;
    color: #aaaabb;
  }
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
  z-index: 999;
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
  max-height: calc(100vh - 30px);
  overflow: visible;
  padding: 25px 32px;
  z-index: 999;
  font-size: 13px;
  border-radius: 10px;
  background: #202227;
  border: 1px solid #ffffff55;
  overflow: auto;
  color: #ffffff;
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
