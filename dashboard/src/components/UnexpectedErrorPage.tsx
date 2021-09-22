import React from "react";
import styled from "styled-components";

const UnexpectedErrorPage = ({ error, resetError }: any) => (
  <>
    <StyledPageNotFound>
      <Mega>
        Unknwown
        <Inside>Unknown Error</Inside>
      </Mega>
      <Flex>
        <BackButton width="140px" onClick={() => resetError(error)}>
          <i className="material-icons">arrow_back</i>
          Reload page
        </BackButton>
        <Splitter>|</Splitter>
        <Helper>
          Sorry for the inconvinience! The Porter team has been notified
        </Helper>
      </Flex>
    </StyledPageNotFound>
  </>
);

export default UnexpectedErrorPage;

const Splitter = styled.div`
  margin: 0 20px;
  font-size: 27px;
  font-weight: 200;
  color: #ffffff15;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Helper = styled.div`
  font-size: 15px;
  max-width: 550px;
  margin-right: -50px;
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 16px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;

const StyledPageNotFound = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #6f6f6f;
  font-size: 16px;
  user-select: none;
  margin-top: -80px;
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
