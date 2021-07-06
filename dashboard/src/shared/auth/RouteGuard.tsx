import React, { useMemo, useContext } from "react";
import { Redirect, Route, RouteProps } from "react-router";
import { AuthContext } from "./AuthContext";
import { isAuthorized } from "./authorization-helpers";
import { ScopeType, Verbs } from "./types";

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
  const auth = useMemo(() => {
    return isAuthorized(currentPolicy, scope, resource, verb);
  }, [currentPolicy, scope, resource, verb]);

  return (
    <Route
      {...rest}
      render={(props) =>
        auth ? (
          children || <Component {...props} />
        ) : (
          <div>"Unauthorized Page"</div>
        )
      }
    />
  );
};

export const fakeGuardedRoute = <ComponentProps extends object>(
  scope: string,
  resource: string,
  verb: Verbs | Array<Verbs>
) => (Component: any) => (props: ComponentProps) => {
  const authContext = useContext(AuthContext);

  if (isAuthorized(authContext.currentPolicy, scope, resource, verb)) {
    return <Component {...props} />;
  }

  return <div>"Unauthorized Page"</div>;
};

export default GuardedRoute;
