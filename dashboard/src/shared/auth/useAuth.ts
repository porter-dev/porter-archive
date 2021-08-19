import { useCallback, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { isAuthorized } from "./authorization-helpers";
import { ScopeType, Verbs } from "./types";

const useAuth = () => {
  const authContext = useContext(AuthContext);

  const isAuth = useCallback(
    (
      scope: ScopeType,
      resource: string | string[],
      verb: Verbs | Array<Verbs>
    ) => isAuthorized(authContext.currentPolicy, scope, resource, verb),
    [authContext.currentPolicy]
  );

  return [isAuth];
};

export default useAuth;
