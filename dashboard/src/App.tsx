import React, { Component } from "react";
import { BrowserRouter } from "react-router-dom";

import MainWrapper from "./main/MainWrapper";

export default class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <MainWrapper />
      </BrowserRouter>
    );
  }
}
