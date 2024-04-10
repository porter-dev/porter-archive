import React from "react";
import { withRouter, type RouteComponentProps } from "react-router";

import AuthzProvider from "shared/auth/AuthzContext";
import MainWrapperErrorBoundary from "shared/error_handling/MainWrapperErrorBoundary";

import AuthnProvider from "../shared/auth/AuthnContext";
import { ContextProvider } from "../shared/Context";
import Main from "./Main";

type PropsType = RouteComponentProps & {};

const MainWrapper: React.FC<PropsType> = ({ history, location }) => {
  return (
    <ContextProvider history={history} location={location}>
      <AuthzProvider>
        <AuthnProvider>
          <MainWrapperErrorBoundary>
            <Main />
          </MainWrapperErrorBoundary>
        </AuthnProvider>
      </AuthzProvider>
    </ContextProvider>
  );
};

export default withRouter(MainWrapper);
