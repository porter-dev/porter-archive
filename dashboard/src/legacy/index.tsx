import "core-js/stable";
import "regenerator-runtime/runtime";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { SetupSentry } from "shared/error_handling/sentry/setup";
import { EnableErrorHandling } from "shared/error_handling/window_error_handling";

import App from "./App";

declare global {
  interface Window {
    analytics: any;
    Intercom: any;
  }
}

if (import.meta.env.ENABLE_SENTRY) {
  SetupSentry();
}

EnableErrorHandling();

ReactDOM.render(<App />, document.getElementById("output"));
