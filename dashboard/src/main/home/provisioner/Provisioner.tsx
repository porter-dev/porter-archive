import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
};

type StateType = {
};

export default class Provisioner extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return (
      <StyledProvisioner>
        [TODO: implement provisioner]
      </StyledProvisioner>
    );
  }
}

const StyledProvisioner = styled.div`
  width: 100%;
  height: 350px;
  background: #ffffff11;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  margin-top: 10px;
`;