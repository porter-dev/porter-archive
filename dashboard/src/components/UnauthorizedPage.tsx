import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {};

type StateType = {};

class UnauthorizedPage extends Component<PropsType, StateType> {
  state = {};

  render() {
    return (
      <StyledUnauthorizedPage>
        <Mega>
          401
          <Inside>You're not authorized to access this page</Inside>
        </Mega>
      </StyledUnauthorizedPage>
    );
  }
}

export default UnauthorizedPage;

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
