import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import * as FullStory from '@fullstory/browser';
 
FullStory.init({ 
  orgId: process.env.FULLSTORY_ORG_ID,
  devMode: process.env.NODE_ENV == 'development'
});

ReactDOM.render(
  <App />,
  document.getElementById("output")
);