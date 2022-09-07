import UnauthorizedPage from "components/UnauthorizedPage";
import React, { useContext, useMemo } from "react";
import { Route, RouteProps } from "react-router";
import { AuthContext } from "./AuthContext";
import { isAuthorized } from "./authorization-helpers";
import { ScopeType, Verbs } from "./types";

import Loading from "components/Loading";
import useAuth from "./useAuth";

type GuardedRouteProps = {
  scope: ScopeType;
  resource: string;
  verb: Verbs | Array<Verbs>;
};

const GuardedRoute: React.FC<RouteProps & GuardedRouteProps> = ({
  component: Component,
  scope,
  resource,
  verb,
  children,
  ...rest
}) => {
  const { currentPolicy } = useContext(AuthContext);
  const [isAuth] = useAuth();

  const render = (props: any) => {
    if (!currentPolicy) {
      return <div> Loading </div>;
    }
    if (isAuth(scope, resource, verb)) {
      return children || <Component {...props} />;
    }
    return <UnauthorizedPage />;
  };

  return <Route {...rest} render={render} />;
};

export const fakeGuardedRoute = <ComponentProps extends object>(
  scope: ScopeType,
  resource: string,
  verb: Verbs | Array<Verbs>
) => (Component: any) => (props: ComponentProps) => {
  const { currentPolicy } = useContext(AuthContext);
  const [isAuth] = useAuth();

  if (!currentPolicy) {
    return <Loading />;
  }
  if (isAuth(scope, resource, verb)) {
    return <Component {...props} />;
  }

  return <UnauthorizedPage />;
};

export default GuardedRoute;
