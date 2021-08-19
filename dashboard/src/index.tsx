import "core-js/stable";
import "regenerator-runtime/runtime";

import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";

declare global {
  interface Window {
    analytics: any;
  }
}

ReactDOM.render(<App />, document.getElementById("output"));
