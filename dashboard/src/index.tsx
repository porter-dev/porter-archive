import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";

import "core-js/stable";
import "regenerator-runtime/runtime";

declare global {
  interface Window {
    analytics: any;
  }
}

ReactDOM.render(<App />, document.getElementById("output"));
