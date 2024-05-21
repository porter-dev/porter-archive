import React, { useCallback, useContext } from "react";
import { AuthzContext } from "./AuthzContext";
import { isAuthorized } from "./authorization-helpers";
import { type ScopeType, type Verbs } from "./types";

export const GuardedComponent = <ComponentProps extends object>(
  scope: ScopeType,
  resource: string,
  verb: Verbs | Verbs[]
) => (Component: any) => (props: ComponentProps) => {
  const authContext = useContext(AuthzContext);

  if (isAuthorized(authContext.currentPolicy, scope, resource, verb)) {
    return <Component {...props} />;
  }

  return null;
};

export type WithAuthProps = {
  isAuthorized: (
    scope: ScopeType,
    resource: string | string[],
    verb: Verbs | Verbs[]
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
    const authContext = useContext(AuthzContext);

    const isAuth = useCallback(
      (scope: ScopeType, resource: string, verb: Verbs | Verbs[]) =>
        isAuthorized(authContext.currentPolicy, scope, resource, verb),
      [authContext.currentPolicy]
    );
    // At this point, the props being passed in are the original props the component expects.
    return <WrappedComponent {...props} isAuthorized={isAuth} />;
  };

  C.displayName = displayName;
  C.WrappedComponent = WrappedComponent;
  return C;
}
