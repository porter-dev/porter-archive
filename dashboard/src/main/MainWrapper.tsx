import React, { Component } from "react";

import { ContextProvider } from "../shared/Context";
import Main from "./Main";
import { RouteComponentProps, withRouter } from "react-router";
import AuthProvider from "shared/auth/AuthContext";

type PropsType = RouteComponentProps & {};

type StateType = {};

class MainWrapper extends Component<PropsType, StateType> {
  render() {
    let { history, location } = this.props;
    return (
      <ContextProvider history={history} location={location}>
        <AuthProvider>
          <Main />
        </AuthProvider>
      </ContextProvider>
    );
  }
}

export default withRouter(MainWrapper);
