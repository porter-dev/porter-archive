import React, { Component } from "react";

import { ContextProvider } from "../shared/Context";
import Main from "./Main";
import { RouteComponentProps, withRouter } from "react-router";
import AuthProvider from "shared/auth/AuthContext";
import MainWrapperErrorBoundary from "shared/error_handling/MainWrapperErrorBoundary";

type PropsType = RouteComponentProps & {};

type StateType = {};

class MainWrapper extends Component<PropsType, StateType> {
  render() {
    let { history, location } = this.props;
    return (
      <ContextProvider history={history} location={location}>
        <AuthProvider>
          <MainWrapperErrorBoundary>
            <Main />
          </MainWrapperErrorBoundary>
        </AuthProvider>
      </ContextProvider>
    );
  }
}

export default withRouter(MainWrapper);
