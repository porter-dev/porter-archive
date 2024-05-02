import React, { useContext, useEffect, useState } from "react";

import api from "shared/api";
import { Context } from "shared/Context";

import { POLICY_HIERARCHY_TREE, populatePolicy } from "./authorization-helpers";
import { type PolicyDocType } from "./types";

type AuthzContext = {
  currentPolicy: PolicyDocType;
};

export const AuthzContext = React.createContext<AuthzContext>(
  {} as AuthzContext
);

const AuthzProvider = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { user, currentProject } = useContext(Context);
  const [currentPolicy, setCurrentPolicy] = useState(null);

  useEffect(() => {
    let isSubscribed = true;
    if (!user || !currentProject?.id) {
      setCurrentPolicy(null);
    } else {
      api
        .getPolicyDocument("<token>", {}, { project_id: currentProject?.id })
        .then((res) => {
          if (!isSubscribed) {
            return;
          }
          const currentPolicy = res.data[0];
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
    <AuthzContext.Provider value={{ currentPolicy }}>
      {children}
    </AuthzContext.Provider>
  );
};

export default AuthzProvider;
