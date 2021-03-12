import React, { Component } from "react";

import { ContextProvider } from "./shared/Context";
import Main from "./main/Main";

type PropsType = {};

type StateType = {};

export default class App extends Component<PropsType, StateType> {
  render() {
    return (
      <ContextProvider>
        <Main />
      </ContextProvider>
    );
  }
}
