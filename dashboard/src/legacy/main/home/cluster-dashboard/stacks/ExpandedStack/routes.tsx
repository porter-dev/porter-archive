import React from "react";
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  useRouteMatch,
} from "react-router";
import styled from "styled-components";

import ExpandedStack from "./ExpandedStack";
import NewAppResourceRoutes from "./NewAppResource";
import NewEnvGroup from "./NewEnvGroup";
import ExpandedStackStoreProvider from "./Store";

const ExpandedStackRoutes = () => {
  const { path } = useRouteMatch();
  const { pathname } = useLocation();

  return (
    <ExpandedStackStoreProvider>
      <Switch>
        <Redirect from="/:url*(/+)" to={pathname.slice(0, -1)} />
        <Route path={`${path}/new-env-group`} exact>
          <StyledLaunchFlow>
            <LaunchContainer>
              <NewEnvGroup />
            </LaunchContainer>
          </StyledLaunchFlow>
        </Route>
        <Route path={`${path}/new-app-resource`}>
          <StyledLaunchFlow>
            <LaunchContainer>
              <NewAppResourceRoutes />
            </LaunchContainer>
          </StyledLaunchFlow>
        </Route>
        <Route path={`${path}`} exact>
          <ExpandedStack />
        </Route>
        <Route path={`*`}>
          <div>Not found</div>
        </Route>
      </Switch>
    </ExpandedStackStoreProvider>
  );
};

export default ExpandedStackRoutes;

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
