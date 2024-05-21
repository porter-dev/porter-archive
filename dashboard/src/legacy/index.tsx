import "core-js/stable";
import "regenerator-runtime/runtime";

import * as React from "react";
import { SetupSentry } from "legacy/shared/error_handling/sentry/setup";
import { EnableErrorHandling } from "legacy/shared/error_handling/window_error_handling";
import * as ReactDOM from "react-dom";

import App from "./App";

declare global {
  interface Window {
    analytics: any;
    Intercom: any;
  }
}

if (process.env.ENABLE_SENTRY) {
  SetupSentry();
}

EnableErrorHandling();

ReactDOM.render(<App />, document.getElementById("output"));
