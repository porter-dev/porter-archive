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

ReactDOM.render(<App />, document.getElementById("output"));
