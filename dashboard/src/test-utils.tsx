import React, { type ReactElement } from "react";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { useHistory, useLocation } from "react-router";
import { BrowserRouter } from "react-router-dom";
import { createGlobalStyle, ThemeProvider } from "styled-components";

import AuthProvider from "shared/auth/AuthContext";
import { ContextProvider } from "shared/Context";
import standard from "shared/themes/standard";

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ThemeProvider theme={standard}>
      <BrowserRouter>
        <ContextProvider history={null} location={null}>
          <AuthProvider>{children}</AuthProvider>
        </ContextProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
): RenderResult =>
  render(ui, {
    wrapper: AllTheProviders,
    ...options,
  });

export * from "@testing-library/react";

export { customRender as render };
