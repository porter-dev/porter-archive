import React, { Component } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import close from '../assets/close.png';

import api from '../shared/api';
import { Context } from '../shared/Context';

import Login from './Login';
import Register from './Register';
import Home from './home/Home';
import { BrowserRouter, Route, Redirect, Switch } from 'react-router-dom';

type PropsType = {
};

type StateType = {
  isLoading: boolean,
  isLoggedIn: boolean,
  initialized: boolean,
};

export default class Main extends Component<PropsType, StateType> {
  
  state = {
    isLoading: false,
    isLoggedIn : false,
    initialized: false
  }

  componentDidMount() {
    localStorage.getItem("init") == 'true' ? this.setState({initialized: true}) : this.setState({initialized: false})
    api.checkAuth('', {}, {}, (err: any, res: any) => {
      if (res.data) {
        this.setState({ isLoggedIn: true, initialized: true})
      } else {
        this.setState({ isLoggedIn: false })
      }
    });
  }

  initialize = () => {
    this.setState({isLoggedIn: true, initialized: true});
    localStorage.setItem('init', 'true');
  }

  renderCurrentError = (): JSX.Element | undefined => {
    if (this.context.currentError) {
      return (
        <CurrentError>
          <ErrorText>Error: {this.context.currentError}</ErrorText>
          <CloseButton onClick={() => { this.context.setCurrentError(null) }}>
            <CloseButtonImg src={close} />
          </CloseButton>
        </CurrentError>
      );
    }
  }

  render() {
    return (

      <StyledMain>
        <GlobalStyle />
        <BrowserRouter>
          <Switch>
            <Route path='/login' render={() => {
              if (!this.state.isLoggedIn && this.state.initialized) {
                return <Login authenticate={() => this.setState({ isLoggedIn: true, initialized: true })} />
              } else {
                return <Redirect to='/' />
              }
            }} />

            <Route path='/register' render={() => {
              if (!this.state.initialized) {
                return <Register authenticate={this.initialize} />
              } else {
                return <Redirect to='/' />
              }
            }} />

            <Route path='/dashboard' render={() => {
              if (this.state.isLoggedIn && this.state.initialized) {
                return <Home logOut={() => this.setState({ isLoggedIn: false, initialized: true })} />
              } else {
                return <Redirect to='/' />
              }
            }}/>

            <Route path='/' render={() => {
              if (this.state.isLoggedIn) {
                return <Redirect to='/dashboard'/>
              } else if (this.state.initialized) {
                return <Redirect to='/login'/>
              } else {
                return <Redirect to='/register' />
              }
            }}/>
          </Switch>
        </BrowserRouter>
        {this.renderCurrentError()}
      </StyledMain>
    );
  }
}

Main.contextType = Context;

const CloseButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-left: 10px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 10px;
`;

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }
`;

const ErrorText = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: calc(100% - 50px);
`;

const CurrentError = styled.div`
  position: fixed;
  bottom: 20px;
  width: 300px;
  left: 17px;
  padding: 15px;
  padding-right: 0px;
  font-family: 'Work Sans', sans-serif;
  height: 50px;
  font-size: 13px;
  border-radius: 3px;
  background: #383842dd;
  border: 1px solid #ffffff55;
  display: flex;
  align-items: center;

  > i {
    font-size: 18px;
    margin-right: 10px;
  }

  animation: floatIn 0.5s;
  animation-fill-mode: forwards;

  @keyframes floatIn {
    from {
      opacity: 0; transform: translateY(20px);
    }
    to {
      opacity: 1; transform: translateY(0px);
    }
  }
`;

const StyledMain = styled.div`
  height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  background: #24272a;
  color: white;
`;
