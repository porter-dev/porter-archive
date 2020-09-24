import React, { Component } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

import { ContextProvider } from './Context';
import Login from './main/Login';
import Register from './main/Register';
import Home from './main/home/Home';

type PropsType = {
};

type StateType = {
  isLoading: boolean,
  isLoggedIn: boolean
  uninitialized: boolean,
};

export default class App extends Component<PropsType, StateType> {
  state = {
    isLoading: false,
    isLoggedIn: false,
    uninitialized: true,
  };

  renderContents = (): JSX.Element => {
    if (this.state.isLoading) {
      return <h1>Loading...</h1>
    } else if (this.state.isLoggedIn) {
      return <Home logOut={() => this.setState({ isLoggedIn: false })} />
    } else if (this.state.uninitialized) {
      return <Register authenticate={() => this.setState({ isLoggedIn: true })} />
    }
    return <Login authenticate={() => this.setState({ isLoggedIn: true })} />
  };

  render() {
    return (
      <ContextProvider>
        <StyledApp>
          <GlobalStyle />
          {this.renderContents()}
        </StyledApp>
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
