import Loading from "components/Loading";
import React from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

type Props = {
  message: string;
  onYes: React.MouseEventHandler;
  onNo: React.MouseEventHandler;
  loading?: boolean;
};

const ConfirmOverlay: React.FC<Props> = ({
  message,
  onYes,
  onNo,
  loading,
}) => {
  return (
    <>
      {
        createPortal(
          <StyledConfirmOverlay>
            {loading ? (
              <Loading />
            ) : (
              <>
                {message}
                <ButtonRow>
                  <ConfirmButton onClick={onYes}>Yes</ConfirmButton>
                  <ConfirmButton onClick={onNo}>No</ConfirmButton>
                </ButtonRow>
              </>
            )}
          </StyledConfirmOverlay>,
          document.body
        )
      }
    </>
  );
};

export default ConfirmOverlay;

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
  color: white;
  flex-direction: column;
  background: rgb(0, 0, 0, 0.55);
  backdrop-filter: blur(5px);
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
  width: 140px;
  margin-top: 30px;
`;

const ConfirmButton = styled.div`
  outline: none;
  height: 40px;
  border: 1px solid white;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  cursor: pointer;
  opacity: 0;
  font-family: "Work Sans", sans-serif;
  font-size: 15px;
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
