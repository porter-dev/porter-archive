import React, { Component } from "react";

import { ContextProvider } from "../shared/Context";
import Main from "./Main";
import { useHistory, useLocation, withRouter } from "react-router";
import AuthProvider from "shared/auth/AuthContext";
import MainWrapperErrorBoundary from "shared/error_handling/MainWrapperErrorBoundary";
import { UnauthorizedPopup } from "shared/auth/UnauthorizedPopup";

const MainWrapper = () => {
  const location = useLocation();
  const history = useHistory();

  return (
    <ContextProvider history={history} location={location}>
      <AuthProvider>
        <MainWrapperErrorBoundary>
          <Main />
        </MainWrapperErrorBoundary>
      </AuthProvider>
      <UnauthorizedPopup />
    </ContextProvider>
  );
};

export default withRouter(MainWrapper);
