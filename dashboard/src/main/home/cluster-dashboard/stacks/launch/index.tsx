import React from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import styled from "styled-components";
import NewApp from "./NewApp";
import Overview from "./Overview";
import SelectSource from "./SelectSource";
import StacksLaunchContextProvider from "./Store";

const LaunchRoutes = () => {
  const { path } = useRouteMatch();

  return (
    <LaunchContainer>
      <StacksLaunchContextProvider>
        <Switch>
          <Route path={`${path}/source`}>
            <SelectSource />
          </Route>
          <Route path={`${path}/overview`}>
            <Overview />
          </Route>
          <Route path={`${path}/new-app/:template_name/:version/:repo_url?`}>
            <NewApp />
          </Route>
          <Route path={`*`}>
            <Redirect to={`${path}/source`} />
          </Route>
        </Switch>
      </StacksLaunchContextProvider>
    </LaunchContainer>
  );
};

export default LaunchRoutes;

const LaunchContainer = styled.div`
  margin: 0 auto;
  width: 100%;
`;
