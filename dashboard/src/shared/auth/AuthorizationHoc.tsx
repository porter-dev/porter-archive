import React from "react";
import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { isAuthorized } from "./authorization-helpers";
import { ScopeType, Verbs } from "./types";

export const withAuth = <ComponentProps extends object>(
  scope: ScopeType,
  resource: string,
  verb: Verbs | Array<Verbs>
) => (Component: any) => (props: ComponentProps) => {
  const authContext = useContext(AuthContext);

  if (isAuthorized(authContext.currentPolicy, scope, resource, verb)) {
    return <Component {...props} />;
  }

  return null;
};
