import React, { Component } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

import { ContextProvider } from './shared/Context';
import Main from './main/Main';
import Login from './main/Login';
import Register from './main/Register';
import Home from './main/home/Home';
import api from './shared/api';

import {
  BrowserRouter,
  Switch,
  Route,
  Link,
  Redirect
} from 'react-router-dom';
type PropsType = {
};

type StateType = {
  isLoggedIn: boolean
  uninitialized: boolean,
};

export default class App extends Component<PropsType, StateType> {
  
  state = {
    isLoggedIn: false,
    uninitialized: false
  }

  componentDidMount() {
    api.checkAuth('', {}, {}, (err: any, res: any) => {
      console.log(res.data)
      if (res.data) {
        this.setState({ isLoggedIn: true, uninitialized: false})
      } else {
        this.setState({ isLoggedIn: false, uninitialized: true })
      }

      localStorage.getitem("init") ? this.setState({uninitialized: false}) : this.setState({uninitialized: true})
      // err ? setCurrentError(JSON.stringify(err)) : authenticate();
    });
  }


  render() {
    return (
      <ContextProvider>
        <BrowserRouter>
          <Switch>
            <Route path='/login' render={() => {
              if (this.state.isLoggedIn) {
                return <Redirect to='/dashboard' />
              } else {
                return <Login authenticate={() => this.setState({ isLoggedIn: true })} />
              }
            }} />

            <Route path='/register' render={() => <Register authenticate={() => this.setState({ isLoggedIn: true })} />} />
            <Route path='/dashboard' render={() => <Home logOut={() => this.setState({ isLoggedIn: false })} />}/>
            <Route path='/' render={() => {
              if (this.state.isLoggedIn) {
                return <Redirect to='/dashboard'/>
              } else if (!this.state.uninitialized) {
                return <Redirect to='/login'/>
              } else {
                return <Redirect to='/register' />
              }
            }}/>
          </Switch>
        </BrowserRouter>
        {/* <Main /> */}
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
