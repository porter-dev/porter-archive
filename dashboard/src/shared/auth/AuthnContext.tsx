import React, { useContext, useEffect, useState } from "react";

import api from "shared/api";
import { Context } from "shared/Context";

type AuthnState = {
  userId: number;
  isLoggedIn: boolean;
  isEmailVerified: boolean;
  handleLogOut: () => void;
  authenticate: () => void;
  isLoading: boolean;
  hasInfo: boolean;
};

export const AuthnContext = React.createContext<AuthnState>({} as AuthnState);

const AuthnProvider = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { setUser, clearContext, setCurrentError } = useContext(Context);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(-1);
  const [hasInfo, setHasInfo] = useState(false);

  const authenticate = (): void => {
    api
      .checkAuth("", {}, {})
      .then((res) => {
        if (res?.data) {
          setUser(res.data.id, res.data.email);
          setIsLoggedIn(true);
          setIsEmailVerified(res.data.email_verified);
          setHasInfo(res.data.company_name && true);
          setIsLoading(false);
          setUserId(res.data.id);
        } else {
          setIsLoggedIn(false);
          setIsLoading(false);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsLoading(false);
      });
  };

  const handleLogOut = (): void => {
    // Clears local storage for proper rendering of clusters
    // Attempt user logout
    api
      .logOutUser("<token>", {}, {})
      .then(() => {
        setIsLoggedIn(false);
        setIsEmailVerified(false);
        clearContext();
        localStorage.clear();
      })
      .catch((err) => {
        setCurrentError(err.response?.data.errors[0]);
      });
  };

  useEffect(() => {
    authenticate();
  }, []);

  return (
    <AuthnContext.Provider
      value={{
        isLoading,
        userId,
        isLoggedIn,
        isEmailVerified,
        hasInfo,
        handleLogOut,
        authenticate,
      }}
    >
      {children}
    </AuthnContext.Provider>
  );
};

export default AuthnProvider;
