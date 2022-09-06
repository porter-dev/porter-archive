import React, { Component } from "react";
import { BrowserRouter } from "react-router-dom";
import PorterErrorBoundary from "shared/error_handling/PorterErrorBoundary";
import styled, { createGlobalStyle } from "styled-components";

import MainWrapper from "./main/MainWrapper";

const App = () => {
  return (
    <StyledMain>
      <GlobalStyle />
      <PorterErrorBoundary errorBoundaryLocation="globalErrorBoundary">
        <BrowserRouter>
          <MainWrapper />
        </BrowserRouter>
      </PorterErrorBoundary>
    </StyledMain>
  );
};

export default App;

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
