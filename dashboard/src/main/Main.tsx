import React, { useState, useEffect, useContext } from "react";
import { Route, Redirect, Switch } from "react-router-dom";

import api from "shared/api";
import { Context } from "shared/Context";
import ResetPasswordInit from "./auth/ResetPasswordInit";
import ResetPasswordFinalize from "./auth/ResetPasswordFinalize";
import Login from "./auth/Login";
import Register from "./auth/Register";
import VerifyEmail from "./auth/VerifyEmail";
import SetInfo from "./auth/SetInfo";
import CurrentError from "./CurrentError";
import Home from "./home/Home";
import Loading from "components/Loading";
import { PorterUrl, PorterUrls } from "shared/routing";

type PropsType = {};

type StateType = {
  loading: boolean;
  isLoggedIn: boolean;
  isEmailVerified: boolean;
  hasInfo: boolean;
  initialized: boolean;
  local: boolean;
  userId: number;
  version: string;
};

const Main: React.FC<PropsType> = () => {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [hasInfo, setHasInfo] = useState(false);
  const [initialized, setInitialized] = useState(localStorage.getItem("init") === "true");
  const [local, setLocal] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const context = useContext(Context);

  useEffect(() => {
    // Get capabilities to case on user info requirements
    api.getMetadata("", {}, {})
      .then((res) => {
        if (res.data?.version !== version) {
          setVersion(res.data?.version);
        }
      })
      .catch((err) => console.log(err));

    let { setUser, setCurrentError } = context;
    let urlParams = new URLSearchParams(window.location.search);
    let error = urlParams.get("error");
    error && setCurrentError(error);
    api
      .checkAuth("", {}, {})
      .then((res) => {
        if (res && res?.data) {
          setUser(res.data.id, res.data.email);
          if (!isLoggedIn) {
            setIsLoggedIn(true);
          }
          if (!isEmailVerified) {
            setIsEmailVerified(res.data.email_verified);
          }
          if (!initialized) {
            setInitialized(true);
          }
          if (!hasInfo) {
            setHasInfo(res.data.company_name && true);
          }
          if (loading) {
            setLoading(false);
          }
          if (userId !== res.data.id) {
            setUserId(res.data.id);
          }
        } else {
          if (isLoggedIn) {
            setIsLoggedIn(false);
          }
          if (loading) {
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        if (isLoggedIn) {
          setIsLoggedIn(false);
        }
        if (loading) {
          setLoading(false);
        }
      });

    api
      .getMetadata("", {}, {})
      .then((res) => {
        useContext(Context).setEdition(res.data?.version);
        setLocal(!res.data?.provisioner);
        useContext(Context).setEnableGitlab(res.data?.gitlab ? true : false);
      })
      .catch((err) => console.log(err));
  }, []);

  const initialize = () => {
    setIsLoggedIn(true);
    setInitialized(true);
    localStorage.setItem("init", "true");
  };

  const authenticate = () => {
    api
      .checkAuth("", {}, {})
      .then((res) => {
        if (res && res?.data) {
          useContext(Context).setUser(res?.data?.id, res?.data?.email);
          setIsLoggedIn(true);
          setIsEmailVerified(res?.data?.email_verified);
          setInitialized(true);
          setHasInfo(res.data.company_name && true);
          setLoading(false);
          setUserId(res.data.id);
        } else {
          setIsLoggedIn(false);
          setLoading(false);
        }
      })
      .catch((err) => {
        setIsLoggedIn(false);
        setLoading(false);
      });
  };

  const handleLogOut = () => {
    // Clears local storage for proper rendering of clusters
    // Attempt user logout
    api
      .logOutUser("<token>", {}, {})
      .then(() => {
        useContext(Context).clearContext();
        setIsLoggedIn(false);
        setInitialized(true);
        localStorage.clear();
      })
      .catch((err) =>
        useContext(Context).setCurrentError(err.response?.data.errors[0])
      );
  };

  const renderMain = () => {
    if (loading || !version) {
      return <Loading />;
    }

    // if logged in but not verified, block until email verification
    if (
      !local &&
      isLoggedIn &&
      !isEmailVerified
    ) {
      return (
        <Switch>
          <Route
            path="/"
            render={() => {
              return <VerifyEmail handleLogOut={handleLogOut} />;
            }}
          />
        </Switch>
      );
    }

    // Handle case where new user signs up via OAuth and has not set name and company
    if (
      version === "production" &&
      !hasInfo && 
      userId > 9312 &&
      isLoggedIn
    ) {
      return (
        <Switch>
          <Route
            path="/"
            render={() => {
              return (
                <SetInfo 
                  handleLogOut={handleLogOut}
                  authenticate={authenticate}
                />
              );
            }}
          />
        </Switch>
      )
    }

    return (
      <Switch>
        <Route
          path="/login"
          render={() => {
            if (!isLoggedIn) {
              return <Login authenticate={authenticate} />;
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
        <Route
          path="/register"
          render={() => {
            if (!isLoggedIn) {
              return <Register authenticate={authenticate} />;
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
        <Route
          path="/password/reset/finalize"
          render={() => {
            if (!isLoggedIn) {
              return <ResetPasswordFinalize />;
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
        <Route
          path="/password/reset"
          render={() => {
            if (!isLoggedIn) {
              return <ResetPasswordInit />;
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
        <Route
          exact
          path="/"
          render={() => {
            if (isLoggedIn) {
              return <Redirect to="/dashboard" />;
            } else {
              return <Redirect to="/login" />;
            }
          }}
        />
        <Route
          path={`/:baseRoute/:cluster?/:namespace?`}
          render={(routeProps) => {
            const baseRoute = routeProps.match.params.baseRoute;
            if (
              isLoggedIn &&
              initialized &&
              PorterUrls.includes(baseRoute)
            ) {
              return (
                <Home
                  key="home"
                  currentProject={useContext(Context).currentProject}
                  currentCluster={useContext(Context).currentCluster}
                  currentRoute={baseRoute as PorterUrl}
                  logOut={handleLogOut}
                />
              );
            } else {
              return <Redirect to="/" />;
            }
          }}
        />
      </Switch>
    );
  };

  return (
    <>
      {renderMain()}
      <CurrentError currentError={useContext(Context).currentError} />
    </>
  );
}

export default Main;
