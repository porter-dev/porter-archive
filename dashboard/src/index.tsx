import "core-js/stable";
import "regenerator-runtime/runtime";

import * as React from "react";
import ReactDOM from "react-dom/client";

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

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("output")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
