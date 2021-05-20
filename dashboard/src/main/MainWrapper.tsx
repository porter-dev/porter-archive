import React, { Component } from "react";
import { BrowserRouter } from "react-router-dom";

import { ContextProvider } from "../shared/Context";
import Main from "./Main";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {};

type StateType = {};

class MainWrapper extends Component<PropsType, StateType> {
  render() {
    let { history, location } = this.props;
    return (
      <ContextProvider history={history} location={location}>
        <Main />
      </ContextProvider>
    );
  }
}

export default withRouter(MainWrapper);
