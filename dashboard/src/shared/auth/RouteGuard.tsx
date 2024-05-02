import React, { useContext, useMemo } from "react";
import { Route, type RouteProps } from "react-router";

import Loading from "components/Loading";
import UnauthorizedPage from "components/UnauthorizedPage";

import { isAuthorized } from "./authorization-helpers";
import { AuthzContext } from "./AuthzContext";
import { type ScopeType, type Verbs } from "./types";

type GuardedRouteProps = {
  scope: ScopeType;
  resource: string;
  verb: Verbs | Verbs[];
};

const GuardedRoute: React.FC<RouteProps & GuardedRouteProps> = ({
  component: Component,
  scope,
  resource,
  verb,
  children,
  ...rest
}) => {
  const { currentPolicy } = useContext(AuthzContext);
  const auth = useMemo(() => {
    return isAuthorized(currentPolicy, scope, resource, verb);
  }, [currentPolicy, scope, resource, verb]);

  const render = (props: any) => {
    if (!currentPolicy) {
      return <div> Loading </div>;
    }
    if (auth) {
      return children || <Component {...props} />;
    }
    return <UnauthorizedPage />;
  };

  return <Route {...rest} render={render} />;
};

export const fakeGuardedRoute =
  <ComponentProps extends object>(
    scope: string,
    resource: string,
    verb: Verbs | Verbs[]
  ) =>
  (Component: any) =>
  (props: ComponentProps) => {
    const { currentPolicy } = useContext(AuthzContext);
    const auth = useMemo(() => {
      return isAuthorized(currentPolicy, scope, resource, verb);
    }, [currentPolicy, scope, resource, verb]);

    if (!currentPolicy) {
      return <Loading />;
    }
    if (auth) {
      return <Component {...props} />;
    }

    return <UnauthorizedPage />;
  };

export default GuardedRoute;
