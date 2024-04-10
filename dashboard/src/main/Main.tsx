import React, { useContext, useEffect, useState } from "react";
import { Redirect, Route, Switch } from "react-router-dom";

import Loading from "components/Loading";

import api from "shared/api";
import { Context } from "shared/Context";
import { PorterUrls, type PorterUrl } from "shared/routing";

import { AuthnContext } from "../shared/auth/AuthnContext";
import Login from "./auth/Login";
import Register from "./auth/Register";
import ResetPasswordFinalize from "./auth/ResetPasswordFinalize";
import ResetPasswordInit from "./auth/ResetPasswordInit";
import SetInfo from "./auth/SetInfo";
import VerifyEmail from "./auth/VerifyEmail";
import CurrentError from "./CurrentError";
import Home from "./home/Home";

type PropsType = {};

const Main: React.FC<PropsType> = () => {
  const {
    currentError,
    user,
    setCurrentError,
    setEdition,
    setEnableGitlab,
    currentProject,
    currentCluster,
  } = useContext(Context);
  const {
    authenticate,
    handleLogOut,
    isLoggedIn,
    isLoading,
    hasInfo,
    isEmailVerified,
  } = useContext(AuthnContext);
  const [local, setLocal] = useState(false);
  const [version, setVersion] = useState("");

  useEffect(() => {
    // Get capabilities to case on user info requirements
    api
      .getMetadata("", {}, {})
      .then((res) => {
        setVersion(res.data?.version);
      })
      .catch((err) => {
        console.log(err);
      });

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    error && setCurrentError(error);

    api
      .getMetadata("", {}, {})
      .then((res) => {
        setEdition(res.data?.version);
        setLocal(!res.data?.provisioner);
        setEnableGitlab(!!res.data?.gitlab);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const renderMain = () => {
    if (isLoading || !version) {
      return <Loading />;
    }

    // if logged in but not verified, block until email verification
    if (!local && isLoggedIn && !isEmailVerified) {
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
    if (version === "production" && !hasInfo && user?.id > 9312 && isLoggedIn) {
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
      );
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
            if (isLoggedIn && PorterUrls.includes(baseRoute)) {
              return (
                <Home
                  key="home"
                  currentProject={currentProject}
                  currentCluster={currentCluster}
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
      <CurrentError currentError={currentError} />
    </>
  );
};

export default Main;
