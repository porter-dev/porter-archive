import "core-js/stable";
import "regenerator-runtime/runtime";

import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import { SetupSentry } from "shared/error_handling/sentry/setup";
import { EnableErrorHandling } from "shared/error_handling/window_error_handling";

declare global {
  interface Window {
    analytics: any;
  }
}
if (process.env.ENABLE_SENTRY) {
  SetupSentry();
}

EnableErrorHandling();

ReactDOM.render(<App />, document.getElementById("output"));
