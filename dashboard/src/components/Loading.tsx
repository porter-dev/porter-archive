import React, { Component } from 'react';
import styled from 'styled-components';
import loading from 'assets/loading.gif';

type PropsType = {
  offset?: string
};

type StateType = {
};

export default class Loading extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return (
      <StyledLoading offset={this.props.offset}>
        <Spinner src={loading} />
      </StyledLoading>
    );
  }
}

const Spinner = styled.img`
  width: 20px;
`;

const StyledLoading = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: ${(props: { offset?: string }) => props.offset};
`;