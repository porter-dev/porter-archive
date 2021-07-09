import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import {
  ADMIN_POLICY_MOCK,
  POLICY_HIERARCHY_TREE,
  populatePolicy,
} from "./authorization-helpers";
import { PolicyDocType } from "./types";

type AuthContext = {
  currentPolicy: PolicyDocType;
};

export const AuthContext = React.createContext<AuthContext>({} as AuthContext);

const AuthProvider: React.FC = ({ children }) => {
  const { user } = useContext(Context);
  const [currentPolicy, setCurrentPolicy] = useState(null);

  useEffect(() => {
    if (!user) {
      setCurrentPolicy(null);
    } else {
      // TODO: GET POLICY FROM ENDPOINT
      setCurrentPolicy(
        populatePolicy(
          ADMIN_POLICY_MOCK,
          POLICY_HIERARCHY_TREE,
          ADMIN_POLICY_MOCK.scope,
          ADMIN_POLICY_MOCK.verbs
        )
      );
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ currentPolicy }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
