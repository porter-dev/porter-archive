import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import {
  VIEWER_POLICY_MOCK,
  POLICY_HIERARCHY_TREE,
  populatePolicy,
  DEV_POLICY_MOCK,
  ADMIN_POLICY_MOCK,
} from "./authorization-helpers";
import { PolicyDocType } from "./types";

type AuthContext = {
  currentPolicy: PolicyDocType;
  setPolicy: (pol: "admin" | "dev" | "viewer") => void;
};

export const AuthContext = React.createContext<AuthContext>({} as AuthContext);

const AuthProvider: React.FC = ({ children }) => {
  const { user } = useContext(Context);
  const [currentPolicy, setCurrentPolicy] = useState(null);

  // useEffect(() => {
  //   if (!user) {
  //     setCurrentPolicy(null);
  //   } else {
  //     // TODO: GET POLICY FROM ENDPOINT
  //     setCurrentPolicy(
  //       populatePolicy(
  //         VIEWER_POLICY_MOCK,
  //         POLICY_HIERARCHY_TREE,
  //         VIEWER_POLICY_MOCK.scope,
  //         VIEWER_POLICY_MOCK.verbs
  //       )
  //     );
  //   }
  // }, [user]);

  useEffect(() => {
    setPolicy("admin");
  }, []);

  // This is just for test case, should be deleted before merged with master
  const setPolicy = (pol: "admin" | "dev" | "viewer") => {
    switch (pol) {
      case "viewer":
        setCurrentPolicy(
          populatePolicy(
            VIEWER_POLICY_MOCK,
            POLICY_HIERARCHY_TREE,
            VIEWER_POLICY_MOCK.scope,
            VIEWER_POLICY_MOCK.verbs
          )
        );
        break;
      case "dev":
        setCurrentPolicy(
          populatePolicy(
            DEV_POLICY_MOCK,
            POLICY_HIERARCHY_TREE,
            DEV_POLICY_MOCK.scope,
            DEV_POLICY_MOCK.verbs
          )
        );
        break;
      default:
        setCurrentPolicy(
          populatePolicy(
            ADMIN_POLICY_MOCK,
            POLICY_HIERARCHY_TREE,
            ADMIN_POLICY_MOCK.scope,
            ADMIN_POLICY_MOCK.verbs
          )
        );
        break;
    }
  };

  return (
    <AuthContext.Provider value={{ currentPolicy, setPolicy }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
