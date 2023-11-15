import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

import { ThemeProvider, createGlobalStyle } from "styled-components";
import { ContextProvider } from "shared/Context";
import AuthProvider from "shared/auth/AuthContext";
import { useHistory, useLocation } from 'react-router';
import { BrowserRouter } from 'react-router-dom';

import standard from "shared/themes/standard";

const AllTheProviders = ({children}: {children: React.ReactNode}) => {
  return (
    <ThemeProvider theme={standard}>
      <BrowserRouter>
        <ContextProvider history={null} location={null}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ContextProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult => render(ui, {
  wrapper: AllTheProviders, 
  ...options
})

export * from '@testing-library/react'
export {customRender as render}