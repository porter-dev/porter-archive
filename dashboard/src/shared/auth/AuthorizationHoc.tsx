import React, { useCallback, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { isAuthorized } from "./authorization-helpers";
import { ScopeType, Verbs } from "./types";
import useAuth from "./useAuth";

export const GuardedComponent = <ComponentProps extends object>(
  scope: ScopeType,
  resource: string,
  verb: Verbs | Array<Verbs>
) => (Component: any) => (props: ComponentProps) => {
  const [isAuth] = useAuth();

  if (isAuth(scope, resource, verb)) {
    return <Component {...props} />;
  }

  return null;
};

export type WithAuthProps = {
  isAuthorized: (
    scope: ScopeType,
    resource: string | Array<string>,
    verb: Verbs | Array<Verbs>
  ) => boolean;
};

export function withAuth<P>(
  // Then we need to type the incoming component.
  // This creates a union type of whatever the component
  // already accepts AND our extraInfo prop
  WrappedComponent: React.ComponentType<P & WithAuthProps>
) {
  const displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  const C = (props: P) => {
    const [isAuth] = useAuth();
    // At this point, the props being passed in are the original props the component expects.
    return <WrappedComponent {...props} isAuthorized={isAuth} />;
  };

  C.displayName = displayName;
  C.WrappedComponent = WrappedComponent;
  return C;
}
