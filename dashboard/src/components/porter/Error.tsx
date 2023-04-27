import React, { useEffect, useState } from "react";
import styled from "styled-components";

import Spacer from "./Spacer";
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
        <Block>
        <Bold>Error:</Bold>
        <Text>{message}</Text>
        {ctaText && (
          <Cta onClick={() => {
            errorModalContents ? setErrorModalOpen(true) : ctaOnClick();
          }}>
            <Underline>{ctaText}</Underline>
            <i className="material-icons">open_in_new</i>
          </Cta>
        )}
        </Block>
      </StyledError>
      {errorModalOpen &&
        <Modal closeModal={() => setErrorModalOpen(false)}>
          {errorModalContents}
        </Modal>
      }
    </>
  );
};

export default Error;

const Text = styled.span`
  display: inline;
`;

const Block = styled.div`
  display: block;
`;

const Underline = styled.span`
  text-decoration: underline;
`;

const Cta = styled.span`
  margin-left: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  
  > i {
    margin-left: 5px;
    font-size: 15px;
  }
`;

const Bold = styled.span`
  font-weight: 600;
  display: inline-block;
  margin-right: 5px;
`;

const StyledError = styled.div`
  line-height: 1.5;
  color: #ff385d;
  font-size: 13px;
  display: flex; 
  align-items: center;
  position: relative;
  padding-left: 25px;
  > i {
    font-size: 18px;
    margin-top: -1px;
    margin-right: 7px;
    float: left;
    font-weight: 600;
    position: absolute;
    top: 1px;
    left: 0;
  }
`;