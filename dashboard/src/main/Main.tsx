import React, { useContext, useEffect, useState } from "react";
import { Redirect, Route, Switch } from "react-router-dom";

import Loading from "components/Loading";

import api from "shared/api";
import { Context } from "shared/Context";
import { PorterUrls, type PorterUrl } from "shared/routing";

import { AuthnContext } from "../shared/auth/AuthnContext";
import CurrentError from "./CurrentError";
import Home from "./home/Home";

type PropsType = {};

const Main: React.FC<PropsType> = () => {
  const {
    currentError,
    setCurrentError,
    setEdition,
    setEnableGitlab,
    currentProject,
    currentCluster,
  } = useContext(Context);
  const { handleLogOut } = useContext(AuthnContext);
  const [version, setVersion] = useState("");

  useEffect(() => {
    // Get capabilities to case on user info requirements
    api
      .getMetadata("", {}, {})
      .then((res) => {
        setVersion(res.data?.version);
      })
      .catch(() => {});

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    error && setCurrentError(error);

    api
      .getMetadata("", {}, {})
      .then((res) => {
        setEdition(res.data?.version);
        setEnableGitlab(!!res.data?.gitlab);
      })
      .catch(() => {});
  }, []);

  const renderMain = (): JSX.Element => {
    if (!version || !currentProject || !currentCluster) {
      return <Loading />;
    }

    return (
      <Switch>
        <Route
          exact
          path="/"
          render={() => {
            return <Redirect to="/dashboard" />;
          }}
        />
        <Route
          path={`/:baseRoute/:cluster?/:namespace?`}
          render={(routeProps) => {
            const baseRoute = routeProps.match.params.baseRoute;
            if (PorterUrls.includes(baseRoute)) {
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
