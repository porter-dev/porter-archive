import React from "react";
import { IntlProvider, ThemeProvider } from "@ory/elements";
import { withRouter, type RouteComponentProps } from "react-router";

import AuthzProvider from "shared/auth/AuthzContext";
import MainWrapperErrorBoundary from "shared/error_handling/MainWrapperErrorBoundary";

import AuthnProvider from "../shared/auth/AuthnContext";
import { ContextProvider } from "../shared/Context";
import Main from "./Main";
// required styles for Ory Elements
import "@ory/elements/style.css";

type PropsType = RouteComponentProps;

const themeOverrides = {
  fontFamily: '"Work Sans", sans-serif',
  // other theme properties...
};

const MainWrapper: React.FC<PropsType> = ({ history, location }) => {
  return (
    <ContextProvider history={history} location={location}>
      <ThemeProvider themeOverrides={themeOverrides}>
        <IntlProvider locale="en" defaultLocale="en">
          <AuthzProvider>
            <AuthnProvider>
              <MainWrapperErrorBoundary>
                <Main />
              </MainWrapperErrorBoundary>
            </AuthnProvider>
          </AuthzProvider>
        </IntlProvider>
      </ThemeProvider>
    </ContextProvider>
  );
};

export default withRouter(MainWrapper);
