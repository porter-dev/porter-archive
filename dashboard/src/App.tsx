import React, { Component } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

import { ContextProvider } from './shared/Context';
import Main from './main/Main';

type PropsType = {
};

type StateType = {
  isLoading: boolean,
  isLoggedIn: boolean
  uninitialized: boolean,
};

export default class App extends Component<PropsType, StateType> {
  render() {
    return (
      <ContextProvider>
        <Main />
      </ContextProvider>
    );
  }
}

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }
`;

const StyledApp = styled.div`
  height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  background: #24272a;
  color: white;
`;
