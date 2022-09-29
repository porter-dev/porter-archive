import React from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import styled from "styled-components";
import NewApp from "./NewApp";
import NewEnvGroup from "./NewEnvGroup";
import Overview from "./Overview";
import SelectSource from "./SelectSource";
import StacksLaunchContextProvider from "./Store";

const LaunchRoutes = () => {
  const { path } = useRouteMatch();

  return (
    <LaunchContainer>
      <StacksLaunchContextProvider>
        <StyledLaunchFlow>
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
            <Route path={`${path}/new-env-group`}>
              <NewEnvGroup />
            </Route>
            <Route path={`*`}>
              <Redirect to={`${path}/source`} />
            </Route>
          </Switch>
        </StyledLaunchFlow>
      </StacksLaunchContextProvider>
    </LaunchContainer>
  );
};

export default LaunchRoutes;

const LaunchContainer = styled.div`
  margin: 0 auto;
  width: 100%;
`;

const StyledLaunchFlow = styled.div`
  width: calc(100% - 100px);
  margin-left: 50px;
  min-width: 300px;
  margin-top: ${(props: { disableMarginTop?: boolean }) =>
    props.disableMarginTop ? "inherit" : "calc(50vh - 380px)"};
  margin-bottom: 50px;
`;
