import { useCallback, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { isAuthorized } from "./authorization-helpers";
import { PolicyDocType, ScopeType, Verbs } from "./types";

const isAuthorizedReducer = (
  scope: ScopeType,
  resource: string | string[],
  verb: Verbs | Array<Verbs>
) => (isAuth: boolean, currPolicy: PolicyDocType) => {
  if (isAuth) {
    return isAuth;
  }

  return isAuthorized(currPolicy, scope, resource, verb);
};

const useAuth = () => {
  const authContext = useContext(AuthContext);

  const isAuth = useCallback(
    (
      scope: ScopeType,
      resource: string | string[],
      verb: Verbs | Array<Verbs>
    ) => {
      if (!authContext || !authContext.currentPolicy) {
        return false;
      }
      // We iterate over all the policies in search for at least one policy that will authorize
      // the user to perform an action.
      return authContext.currentPolicy.reduce(
        isAuthorizedReducer(scope, resource, verb),
        false
      );
    },
    [authContext.currentPolicy]
  );

  return [isAuth];
};

export default useAuth;
