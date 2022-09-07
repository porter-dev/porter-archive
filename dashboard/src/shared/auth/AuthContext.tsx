import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { POLICY_HIERARCHY_TREE, populatePolicy } from "./authorization-helpers";
import { PolicyDocType } from "./types";

type AuthContext = {
  currentPolicy: PolicyDocType[];
};

export const AuthContext = React.createContext<AuthContext>({} as AuthContext);

const AuthProvider: React.FC = ({ children }) => {
  const { user, currentProject } = useContext(Context);
  const [currentPolicy, setCurrentPolicy] = useState<PolicyDocType[]>(null);

  useEffect(() => {
    let isSubscribed = true;
    if (!user || !currentProject?.id) {
      setCurrentPolicy(null);
    } else {
      api
        .getPolicyDocument<PolicyDocType[]>(
          "<token>",
          {},
          { project_id: currentProject?.id }
        )
        .then((res) => {
          if (!isSubscribed) {
            return;
          }

          const policies = res.data.map((incompletePolicy) =>
            populatePolicy(
              incompletePolicy,
              POLICY_HIERARCHY_TREE,
              incompletePolicy.scope,
              incompletePolicy.verbs
            )
          );
          setCurrentPolicy(policies);
        });
    }
    return () => {
      isSubscribed = false;
    };
  }, [user, currentProject?.id]);

  return (
    <AuthContext.Provider value={{ currentPolicy }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
