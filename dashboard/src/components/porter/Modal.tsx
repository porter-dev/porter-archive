import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { createPortal } from "react-dom";

type Props = {
  closeModal?: () => void;
  children: React.ReactNode;
  width?: string;
};

const Modal: React.FC<Props> = ({
  closeModal,
  children,
  width,
}) => {
  return (
    <>
      {
        createPortal(
          <ModalWrapper>
            <ModalBg onClick={closeModal} />
            <StyledModal width={width}> 
              {closeModal && (
                <CloseButton onClick={closeModal}>
                  <i className="material-icons">close</i>
                </CloseButton>
              )}
              {children}
            </StyledModal>
          </ModalWrapper>,
          document.body
        )
      }
    </>
  );
};

export default Modal;

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
  right: 12px;
  top: 10px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;

const ModalWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  margin: 0;
  padding: 0;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 100;
`;

const ModalBg = styled.div`
  position: fixed;
  margin: 0;
  padding: 0;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  animation: fadeInModal 0.5s 0s;
  @keyframes fadeInModal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledModal = styled.div<{
  width?: string;
}>`
  position: relative;
  padding: 25px;
  padding-bottom: 35px;
  border-radius: 10px;
  border: 1px solid #494b4f;
  font-size: 13px;
  width: ${props => props.width || "600px"};
  background: #42444933;
  backdrop-filter: saturate(150%) blur(8px);

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