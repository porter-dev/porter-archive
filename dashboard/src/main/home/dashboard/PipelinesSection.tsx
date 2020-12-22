import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
};

type StateType = {
};

export default class PipelinesSection extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return (
      <StyledPipelinesSection>
        
      </StyledPipelinesSection>
    );
  }
}

const StyledPipelinesSection = styled.div`
  width: 100%;
  height: calc(100vh - 380px);
  margin-top: 30px;
  display: flex;
  align-items: center;
  color: #aaaabb;
  border-radius: 5px;
  text-align: center;
  font-size: 13px;
  background: #ffffff08;
  font-family: 'Work Sans', sans-serif;
`;