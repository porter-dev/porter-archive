import "core-js/stable";
import "regenerator-runtime/runtime";

import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import { SetupSentry } from "shared/sentry/setup";

declare global {
  interface Window {
    analytics: any;
  }
}
if (process.env.ENABLE_SENTRY) {
  SetupSentry();
}

function EnableErrorHandling() {
  window.onerror = function (msg, file, line, col, error) {
    StackTrace.fromError(error).then((err) => {});
  };
}

ReactDOM.render(<App />, document.getElementById("output"));
