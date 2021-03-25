import React, { Component } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";

import api from "shared/api";
import { Context } from "shared/Context";

import ResetPasswordInit from "./auth/ResetPasswordInit";
import ResetPasswordFinalize from "./auth/ResetPasswordFinalize";
import Login from "./auth/Login";
import Register from "./auth/Register";
import VerifyEmail from "./auth/VerifyEmail";
import CurrentError from "./CurrentError";
import Home from "./home/Home";
import Loading from "components/Loading";
import { PorterUrl, PorterUrls } from "shared/routing";

type PropsType = {};

type StateType = {
  loading: boolean;
  isLoggedIn: boolean;
  isEmailVerified: boolean;
  initialized: boolean;
};

export default class Main extends Component<PropsType, StateType> {
  state = {
    loading: true,
    isLoggedIn: false,
    isEmailVerified: false,
    initialized: localStorage.getItem("init") === "true"
  };

  componentDidMount() {
    let { setUser, setCurrentError } = this.context;
    let urlParams = new URLSearchParams(window.location.search);
    let error = urlParams.get("error");
    error && setCurrentError(error);
    api
      .checkAuth("", {}, {})
      .then(res => {
        if (res && res.data) {
          setUser(res?.data?.id, res?.data?.email);
          this.setState({
            isLoggedIn: true,
            isEmailVerified: res?.data?.email_verified,
            initialized: true,
            loading: false
          });
        } else {
          this.setState({ isLoggedIn: false, loading: false });
        }
      })
      .catch(err => this.setState({ isLoggedIn: false, loading: false }));
  }

  initialize = () => {
    this.setState({ isLoggedIn: true, initialized: true });
    localStorage.setItem("init", "true");
  };

  authenticate = () => {
    api
      .checkAuth("", {}, {})
      .then(res => {
        if (res && res.data) {
          this.context.setUser(res?.data?.id, res?.data?.email);
          this.setState({
            isLoggedIn: true,
            isEmailVerified: res?.data?.email_verified,
            initialized: true,
            loading: false
          });
        } else {
          this.setState({ isLoggedIn: false, loading: false });
        }
      })
      .catch(err => this.setState({ isLoggedIn: false, loading: false }));
  };

  handleLogOut = () => {
    // Clears local storage for proper rendering of clusters
    // Attempt user logout
    api
      .logOutUser("<token>", {}, {})
      .then(() => {
        this.context.clearContext();
        this.setState({ isLoggedIn: false, initialized: true });
        localStorage.clear();
      })
      .catch(err => this.context.setCurrentError(err.response.data.errors[0]));
  };

  renderMain = () => {
    if (this.state.loading) {
      return <Loading />;
    }

    // if logged in but not verified, block until email verification
    if (this.state.isLoggedIn && !this.state.isEmailVerified) {
      return (
        <Switch>
          <Route
            path="/"
            render={() => {
              return <VerifyEmail handleLogout={this.handleLogOut} />;
            }}
          />
        </Switch>
      );
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
          path="/password/reset/finalize"
          render={() => {
            if (!this.state.isLoggedIn) {
              return <ResetPasswordFinalize />;
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
        <Route
          path="/password/reset"
          render={() => {
            if (!this.state.isLoggedIn) {
              return <ResetPasswordInit />;
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
          path={`/:baseRoute`}
          render={routeProps => {
            const baseRoute = routeProps.match.params.baseRoute;
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
