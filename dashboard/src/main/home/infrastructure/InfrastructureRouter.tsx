import React from "react";
import { Route, Switch } from "react-router-dom";
import { withRouter } from "react-router";
import InfrastructureList from "./InfrastructureList";
import ExpandedInfra from "./ExpandedInfra";
import ProvisionInfra from "./components/ProvisionInfra";

const InfrastructureRouter = () => {
  return (
    <Switch>
      <Route
        path="/infrastructure/provision"
        render={({ match }) => {
          return <ProvisionInfra />;
        }}
      />
      <Route
        path="/infrastructure/:infra"
        render={({ match }) => {
          return <ExpandedInfra infra_id={parseInt(match.params["infra"])} />;
        }}
      />
      <Route path="/infrastructure" render={() => <InfrastructureList />} />
    </Switch>
  );
};

export default withRouter(InfrastructureRouter);
