import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

import expand from "assets/expand.png";
import Modal from "./Modal";

type Props = {
  message: string;
  ctaText?: string;
  ctaOnClick?: () => void;
  errorModalContents?: React.ReactNode;
};

const Error: React.FC<Props> = ({
  message,
  ctaText,
  ctaOnClick,
  errorModalContents,
}) => {
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  
  return (
    <>
      <StyledError>
        <i className="material-icons">error_outline</i>
        <Bold>Error:</Bold>
        {message}
        {ctaText && (
          <Cta onClick={() => {
            errorModalContents ? setErrorModalOpen(true) : ctaOnClick();
          }}>
            <Underline>{ctaText}</Underline>
            <i className="material-icons">open_in_new</i>
          </Cta>
        )}
      </StyledError>
      {errorModalOpen && createPortal(
        <Modal closeModal={() => setErrorModalOpen(false)}>
          {errorModalContents}
        </Modal>,
        document.body
      )}
    </>
  );
};

export default Error;

const Underline = styled.span`
  text-decoration: underline;
`;

const Cta = styled.span`
  margin-left: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  
  > i {
    margin-left: 5px;
    font-size: 15px;
  }
`;

const Bold = styled.span`
  font-weight: 600;
  margin-right: 5px;
`;

const StyledError = styled.div`
  line-height: 1.5;
  color: #ff385d;
  font-size: 13px;
  display: flex; 
  align-items: center;
  > i {
    font-size: 18px;
    margin-top: -1px;
    margin-right: 7px;
    float: left;
    font-weight: 600;
  }
`;