import React, { createContext, useContext } from "react";

import Loading from "components/Loading";

import { type ClusterType, type ProjectType } from "shared/types";

type PorterUser = {
  userId: number;
  email: string;
  isPorterUser: boolean;
};

type AuthContextType = {
  currentProject: ProjectType;
  currentCluster: ClusterType;
  user?: PorterUser;
};

export const AuthStateContext = createContext<AuthContextType | null>(null);

export const useAuthState = (): AuthContextType => {
  const context = useContext(AuthStateContext);
  if (context === null) {
    throw new Error("useAuthState must be used within a AuthStateProvider");
  }
  return context;
};

type AuthStateProviderProps = {
  children: JSX.Element;
  currentProject?: ProjectType;
  currentCluster?: ClusterType;
  user?: PorterUser;
};

export const AuthStateProvider: React.FC<AuthStateProviderProps> = ({
  children,
  currentProject,
  currentCluster,
  user,
}) => {
  if (!currentProject || !currentCluster || !user) {
    return <Loading />;
  }

  return (
    <AuthStateContext.Provider value={{ currentProject, currentCluster, user }}>
      {children}
    </AuthStateContext.Provider>
  );
};
