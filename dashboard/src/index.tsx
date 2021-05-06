import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import { H } from "highlight.run";

declare global {
  interface Window {
    analytics: any;
  }
}

H.init("y2d13lgr");
ReactDOM.render(<App />, document.getElementById("output"));
