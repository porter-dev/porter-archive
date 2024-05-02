import { useCallback, useContext } from "react";

import { isAuthorized } from "./authorization-helpers";
import { AuthzContext } from "./AuthzContext";
import { type ScopeType, type Verbs } from "./types";

const useAuth = () => {
  const authContext = useContext(AuthzContext);

  const isAuth = useCallback(
    (scope: ScopeType, resource: string | string[], verb: Verbs | Verbs[]) =>
      isAuthorized(authContext.currentPolicy, scope, resource, verb),
    [authContext.currentPolicy]
  );

  return [isAuth];
};

export default useAuth;
