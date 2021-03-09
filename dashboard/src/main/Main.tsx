import React, { Component } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";

import api from "shared/api";
import { Context } from "shared/Context";

import Login from "./Login";
import Register from "./Register";
import CurrentError from "./CurrentError";
import Home from "./home/Home";
import Loading from "components/Loading";
import { PorterUrl, PorterUrls } from "shared/routing";

type PropsType = {};

type StateType = {
  loading: boolean;
  isLoggedIn: boolean;
  initialized: boolean;
};

export default class Main extends Component<PropsType, StateType> {
  state = {
    loading: true,
    isLoggedIn: false,
    initialized: localStorage.getItem("init") === "true",
  };

  componentDidMount() {
    let { setUser, setCurrentError } = this.context;
    let urlParams = new URLSearchParams(window.location.search);
    let error = urlParams.get("error");
    error && setCurrentError(error);
    api
      .checkAuth("", {}, {})
      .then((res) => {
        if (res && res.data) {
          setUser(res?.data?.id, res?.data?.email);
          this.setState({
            isLoggedIn: true,
            initialized: true,
            loading: false,
          });
        } else {
          this.setState({ isLoggedIn: false, loading: false });
        }
      })
      .catch((err) => this.setState({ isLoggedIn: false, loading: false }));
  }

  initialize = () => {
    this.setState({ isLoggedIn: true, initialized: true });
    localStorage.setItem("init", "true");
  };

  authenticate = () => {
    this.setState({ isLoggedIn: true, initialized: true });
  };

  handleLogOut = () => {
    // Clears local storage for proper rendering of clusters
    localStorage.clear();

    this.context.clearContext();
    this.setState({ isLoggedIn: false, initialized: true });
  };

  renderMain = () => {
    if (this.state.loading) {
      return <Loading />;
    }

    return (
      <Switch>
        <Route
          path="/login"
          render={() => {
            if (!this.state.isLoggedIn) {
              return <Login authenticate={this.authenticate} />;
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
        <Route
          path="/register"
          render={() => {
            if (!this.state.isLoggedIn) {
              return <Register authenticate={this.initialize} />;
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
        <Route
          exact
          path="/"
          render={() => {
            if (this.state.isLoggedIn) {
              return <Redirect to="/dashboard" />;
            } else {
              return <Redirect to="/login" />;
            }
          }}
        />
        <Route
          path={`/*`}
          render={(routeProps) => {
            const baseRoute = routeProps.location.pathname.slice(1);
            if (
              this.state.isLoggedIn &&
              this.state.initialized &&
              PorterUrls.includes(baseRoute)
            ) {
              return (
                <Home
                  key="home"
                  currentProject={this.context.currentProject}
                  currentCluster={this.context.currentCluster}
                  currentRoute={baseRoute as PorterUrl}
                  logOut={this.handleLogOut}
                />
              );
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
      </Switch>
    );
  };

  render() {
    return (
      <StyledMain>
        <GlobalStyle />
        <BrowserRouter>{this.renderMain()}</BrowserRouter>
        <CurrentError currentError={this.context.currentError} />
      </StyledMain>
    );
  }
}

Main.contextType = Context;

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    font-family: 'Work Sans', sans-serif;
  }
  
  body {
    background: #202227;
    overscroll-behavior-x: none;
  }

  a {
    color: #949eff;
    text-decoration: none;
  }

  img {
    max-width: 100%;
  }
`;

const StyledMain = styled.div`
  height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  background: #202227;
  color: white;
`;
