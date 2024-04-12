import React, { Component } from "react";
import { Route, Redirect, Switch } from "react-router-dom";

import api from "shared/api";
import { Context } from "shared/Context";
import ResetPasswordInit from "./auth/ResetPasswordInit";
import ResetPasswordFinalize from "./auth/ResetPasswordFinalize";
import Login from "./auth/Login";
import Register from "./auth/Register";
import VerifyEmail from "./auth/VerifyEmail";
import SetInfo from "./auth/SetInfo";
import CurrentError from "./CurrentError";
import Home from "./home/Home";
import Loading from "components/Loading";
import { PorterUrl, PorterUrls } from "shared/routing";

type PropsType = {};

type StateType = {
  loading: boolean;
  isLoggedIn: boolean;
  isEmailVerified: boolean;
  hasInfo: boolean;
  initialized: boolean;
  local: boolean;
  userId: number;
  version: string;
};

export default class Main extends Component<PropsType, StateType> {
  state = {
    loading: true,
    isLoggedIn: false,
    isEmailVerified: false,
    hasInfo: false,
    initialized: localStorage.getItem("init") === "true",
    local: false,
    userId: null as number,
    version: null as string,
  };

  componentDidMount() {

    // Get capabilities to case on user info requirements
    api.getMetadata("", {}, {})
      .then((res) => {
        this.setState({
          version: res.data?.version,
        })
      })
      .catch((err) => console.log(err));

    let { setUser, setCurrentError } = this.context;
    let urlParams = new URLSearchParams(window.location.search);
    let error = urlParams.get("error");
    error && setCurrentError(error);
    api
      .checkAuth("", {}, {})
      .then((res) => {
        if (res && res?.data) {
          setUser(res.data.id, res.data.email);
          this.setState({
            isLoggedIn: true,
            isEmailVerified: res.data.email_verified,
            initialized: true,
            hasInfo: res.data.company_name && true,
            loading: false,
            userId: res.data.id,
          });
        } else {
          this.setState({ isLoggedIn: false, loading: false });
        }
      })
      .catch((err) => this.setState({ isLoggedIn: false, loading: false }));

    api
      .getMetadata("", {}, {})
      .then((res) => {
        this.context.setEdition(res.data?.version);
        this.setState({ local: !res.data?.provisioner });
        this.context.setEnableGitlab(res.data?.gitlab ? true : false);
      })
      .catch((err) => console.log(err));
  }

  initialize = () => {
    this.setState({ isLoggedIn: true, initialized: true });
    localStorage.setItem("init", "true");
  };

  authenticate = () => {
    api
      .checkAuth("", {}, {})
      .then((res) => {
        if (res && res?.data) {
          this.context.setUser(res?.data?.id, res?.data?.email);
          this.setState({
            isLoggedIn: true,
            isEmailVerified: res?.data?.email_verified,
            initialized: true,
            hasInfo: res.data.company_name && true,
            loading: false,
            userId: res.data.id,
          });
        } else {
          this.setState({ isLoggedIn: false, loading: false });
        }
      })
      .catch((err) => this.setState({ isLoggedIn: false, loading: false }));
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
      .catch((err) =>
        this.context.setCurrentError(err.response?.data.errors[0])
      );
  };

  renderMain = () => {
    if (this.state.loading || !this.state.version) {
      return <Loading />;
    }

    // if logged in but not verified, block until email verification
    if (
      !this.state.local &&
      this.state.isLoggedIn &&
      !this.state.isEmailVerified
    ) {
      return (
        <Switch>
          <Route
            path="/"
            render={() => {
              return <VerifyEmail handleLogOut={this.handleLogOut} />;
            }}
          />
        </Switch>
      );
    }

    // Handle case where new user signs up via OAuth and has not set name and company
    if (
      this.state.version === "production" &&
      !this.state.hasInfo && 
      this.state.userId > 9312 &&
      this.state.isLoggedIn
    ) {
      return (
        <Switch>
          <Route
            path="/"
            render={() => {
              return (
                <SetInfo 
                  handleLogOut={this.handleLogOut}
                  authenticate={this.authenticate}
                />
              );
            }}
          />
        </Switch>
      )
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
              return <Register authenticate={this.authenticate} />;
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
          path={`/:baseRoute/:cluster?/:namespace?`}
          render={(routeProps) => {
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
      <>
        {this.renderMain()}
        <CurrentError currentError={this.context.currentError} />
      </>
    );
  }
}

Main.contextType = Context;
