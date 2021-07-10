import React from "react";
import styled from "styled-components";

const UnauthorizedPage: React.FunctionComponent = () => (
  <StyledUnauthorizedPage>
    <Mega>
      401
      <Inside>You're not authorized to access this page</Inside>
    </Mega>
  </StyledUnauthorizedPage>
);

export default UnauthorizedPage;

const StyledUnauthorizedPage = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #6f6f6f;
  font-size: 16px;
  user-select: none;
  padding-bottom: 20px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Mega = styled.div`
  font-size: 200px;
  color: #ffffff06;
  position: relative;
  font-weight: bold;
  text-align: center;

  > i {
    font-size: 23px;
    margin-right: 12px;
  }
`;

const Inside = styled.div`
  position: absolute;
  color: #6f6f6f;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 400;
  font-size: 20px;

  > i {
    font-size: 23px;
    margin-right: 12px;
  }
`;
