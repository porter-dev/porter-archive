import React, { Component } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import close from '../assets/close.png';

import api from '../shared/api';
import { Context } from '../shared/Context';

import Login from './Login';
import Register from './Register';
import CurrentError from './CurrentError';
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
  
  authenticate = () => {
    this.setState({ isLoggedIn: true, initialized: true });
  }

  render() {
    return (

      <StyledMain>
        <GlobalStyle />
        <BrowserRouter>
          <Switch>
            <Route path='/login' render={() => {
              if (!this.state.isLoggedIn && this.state.initialized) {
                return <Login authenticate={this.authenticate} />
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
        <CurrentError />
      </StyledMain>
    );
  }
}

Main.contextType = Context;

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
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
