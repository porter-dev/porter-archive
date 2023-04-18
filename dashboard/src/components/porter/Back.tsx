import React, { useEffect, useState } from "react";
import styled from "styled-components";

import leftArrow from "assets/left-arrow.svg";
import Text from "./Text";
import Container from "./Container";
import { Link } from "react-router-dom";

type Props = {
  to?: string;
  onClick?: () => void;
};

const Back: React.FC<Props> = ({
  to,
  onClick,
}) => {
  return (
    <Container row>
      {to ? (
        <BackLink to={to}>
          <ArrowIcon src={leftArrow} />
          Back
        </BackLink>
      ) : (
        <StyledBack onClick={onClick}>
          <ArrowIcon src={leftArrow} />
          Back
        </StyledBack>
      )}
    </Container>
  );
};

export default Back;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const BackLink = styled(Link)`
  color: #aaaabb88;
  font-size: 13px;
  margin-bottom: 15px;
  display: flex;
  margin-top: -10px;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const StyledBack = styled.div`
color: #aaaabb88;
font-size: 13px;
margin-bottom: 15px;
display: flex;
margin-top: -10px;
z-index: 999;
padding: 5px;
padding-right: 7px;
border-radius: 5px;
cursor: pointer;
:hover {
  background: #ffffff11;
}
`;