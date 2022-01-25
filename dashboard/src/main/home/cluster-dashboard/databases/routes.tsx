import React, { useContext, useEffect, useLayoutEffect } from "react";
import { Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import CreateDatabaseForm from "./CreateDatabaseForm";
import DatabasesHome from "./DatabasesHome";

const DatabasesRoutes = () => {
  const { url } = useRouteMatch();
  const { currentCluster, currentProject } = useContext(Context);
  const { pushFiltered } = useRouting();

  useLayoutEffect(() => {
    if (
      currentCluster.service !== "eks" ||
      currentCluster.infra_id <= 0 ||
      !currentProject.enable_rds_databases
    ) {
      pushFiltered("/cluster-dashboard", []);
    }
  }, [currentCluster]);

  return (
    <>
      <Switch>
        <Route path={`${url}/provision-database`}>
          <CreateDatabaseForm />
        </Route>
        <Route path={`${url}/`}>
          <DatabasesHome />
        </Route>
      </Switch>
    </>
  );
};

export default DatabasesRoutes;
