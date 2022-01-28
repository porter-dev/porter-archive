import React from "react";
import { Route, Switch } from "react-router-dom";
import { withRouter } from "react-router";
import InfrastructureList from "./InfrastructureList";
import ExpandedInfra from "./ExpandedInfra";

const InfrastructureRouter = () => {
  return (
    <Switch>
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

// return (
//     <Switch>
//       <Route path="/:baseRoute/:clusterName+/:namespace/:chartName">
//         <ExpandedChartWrapper
//           setSidebar={setSidebar}
//           isMetricsInstalled={this.state.isMetricsInstalled}
//         />
//       </Route>
//       <GuardedRoute
//         path={"/jobs"}
//         scope="job"
//         resource=""
//         verb={["get", "list"]}
//       >
//         {this.renderContents()}
//       </GuardedRoute>
//       <GuardedRoute
//         path={"/applications"}
//         scope="application"
//         resource=""
//         verb={["get", "list"]}
//       >
//         {this.renderContents()}
//       </GuardedRoute>
//       <GuardedRoute
//         path={"/env-groups"}
//         scope="env_group"
//         resource=""
//         verb={["get", "list"]}
//       >
//         {this.renderContents()}
//       </GuardedRoute>
//       <Route path={"/databases"}>
//         <LazyDatabasesRoutes />
//       </Route>
//       <Route path={["/cluster-dashboard"]}>
//         <DashboardRoutes />
//       </Route>
//     </Switch>
//   );
