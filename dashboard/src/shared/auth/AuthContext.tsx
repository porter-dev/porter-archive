import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { POLICY_HIERARCHY_TREE, populatePolicy } from "./authorization-helpers";
import { PolicyDocType } from "./types";

type AuthContext = {
  currentPolicy: PolicyDocType;
};

export const AuthContext = React.createContext<AuthContext>({} as AuthContext);

const AuthProvider: React.FC = ({ children }) => {
  const { user, currentProject } = useContext(Context);
  const [currentPolicy, setCurrentPolicy] = useState(null);

  useEffect(() => {
    let isSubscribed = true;
    if (!user) {
      setCurrentPolicy(null);
    } else {
      api
        .getPolicyDocument("<token>", {}, { project_id: currentProject?.id })
        .then((res) => {
          if (!isSubscribed) {
            return;
          }
          const currentPolicy = res.data[0];
          console.log(currentPolicy);
          setCurrentPolicy(
            populatePolicy(
              currentPolicy,
              POLICY_HIERARCHY_TREE,
              currentPolicy.scope,
              currentPolicy.verbs
            )
          );
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
