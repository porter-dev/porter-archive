import React from "react";
import { Route, Switch } from "react-router-dom";
import { withRouter } from "react-router";
import { useParams } from "react-router-dom";
import InfrastructureList from "./InfrastructureList";
import ExpandedInfra from "./ExpandedInfra";
import ProvisionInfra from "./components/ProvisionInfra";

const InfrastructureRouter = () => {
  return (
    <Switch>
      <Route path="/infrastructure/provision/:name">
        <ProvisionInfra />
      </Route>
      <Route path="/infrastructure/provision">
        <ProvisionInfra />
      </Route>
      <Route path="/infrastructure/:infra_id_str">
        <ExpandedInfra />
      </Route>
      <Route path="/infrastructure">
        <InfrastructureList />
      </Route>
    </Switch>
  );
};

export default withRouter(InfrastructureRouter);
