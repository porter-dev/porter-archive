import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
};

type StateType = {
};

export default class LogSection extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return (
      <StyledLogSection>
        (Logs unimplemented)
      </StyledLogSection>
    );
  }
}

const StyledLogSection = styled.div`
  width: 100%;
  height: 100%;
  background: #202227;
  position: relative;
  padding: 20px;
`;