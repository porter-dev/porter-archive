import React, { useContext, useEffect, useMemo, useState } from "react";
import { Redirect, Route, Switch } from "react-router-dom";

import api from "shared/api";
import { Context } from "shared/Context";

import { Configuration, FrontendApi, Session, Identity } from "@ory/client"
import {useQuery} from "@tanstack/react-query";
import {clusterStateValidator} from "../../lib/clusters/types";
import {Invite, inviteValidator} from "../../lib/invites/types";
import {z} from "zod";
import Loading from "../../components/Loading";
import Login from "../../main/auth/Login";
import Register from "../../main/auth/Register";
import ResetPasswordFinalize from "../../main/auth/ResetPasswordFinalize";
import ResetPasswordInit from "../../main/auth/ResetPasswordInit";
import SetInfo from "../../main/auth/SetInfo";
import VerifyEmail from "../../main/auth/VerifyEmail";
import CurrentError from "../../main/CurrentError";

// Get your Ory url from .env
// Or localhost for local development
const basePath = process.env.REACT_APP_ORY_URL || "http://localhost:4000"
const ory = new FrontendApi(
    new Configuration({
        basePath,
        baseOptions: {
            withCredentials: true,
        },
    }),
)


type AuthnState = {
  userId: number;
  handleLogOut: () => void;
    session: Session | null;
    invites: Invite[];
    checkInvites: () => void;
    invitesLoading: boolean;
};

export const AuthnContext = React.createContext<AuthnState | null>(null);

export const useAuthn = (): AuthnState => {
  const context = useContext(AuthnContext);
  if (context == null) {
    throw new Error("useAuthn must be used within an AuthnContext");
  }
  return context;
};

const AuthnProvider = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { setUser, clearContext, setCurrentError, currentError } =
    useContext(Context);
    const [isPorterAuthenticated, setIsPorterAuthenticated] = useState(false);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [userId, setUserId] = useState(-1);
  const [hasInfo, setHasInfo] = useState(false);
  const [session, setSession] = useState<Session | null>(null)
  const [logoutUrl, setLogoutUrl] = useState<string | undefined>()
  const [invites, setInvites] = useState<Invite[]>([])
  const [local, setLocal] = useState(false);

    console.log(invites)

  const authenticate = async (): Promise<void> => {
      api
          .checkAuth("", {}, {})
          .then((res) => {
              if (res?.data) {
                  setUser?.(res.data.id, res.data.email);
                  setIsEmailVerified(res.data.email_verified);
                  setIsPorterAuthenticated(true);
                  setIsEmailVerified(res.data.email_verified);
                  setHasInfo(res.data.company_name && true);
                  setUserId(res.data.id);
              } else {
                  setIsPorterAuthenticated(false);
              }
          })
          .catch(() => {
              setIsPorterAuthenticated(false);
          })
          .then(() => {
              ory
                  .toSession()
                  .then(({data}) => {

                      // Create a logout url
                      ory.createBrowserLogoutFlow().then(({data}) => {
                          setLogoutUrl(data.logout_url)
                      })

                      // User has a session!
                      setSession(data)
                      setIsEmailVerified(true)
                  }).catch((err) => {
                  console.log(err)
              })
          })
          .catch((err) => {
              setSession(null)
              console.error(err)
          })
          .finally(() => {
            setIsLoading(false);
        });
    };

  const handleLogOut = (): void => {
    // Clears local storage for proper rendering of clusters
    // Attempt user logout
   if (isPorterAuthenticated) {
       api
           .logOutUser("<token>", {}, {})
           .then(() => {
               setIsLoggedIn(false);
               setIsPorterAuthenticated(false);
               setIsEmailVerified(false);
               clearContext();
               localStorage.clear();
           }).catch((err) => {
               setCurrentError(err.response?.data.errors[0]);
           })
   }

   if (session && logoutUrl) {
       window.location.replace(logoutUrl)
   }
  };

    useEffect(() => {
        setIsLoggedIn(isPorterAuthenticated || !!session)
    }, [isPorterAuthenticated, session])

    useEffect(() => {
        checkInvites()
    }, [userId])

    const checkInvites =  () => {
        setInvitesLoading(true)
        api.listUserInvites(
            "<token>",
            {},
            {}
        )
            .then((res) => {
                const parsed = z.array(inviteValidator).safeParse(res.data)
                if (parsed.success) {
                    console.log(parsed.data)
                    setInvites(parsed.data)
                } else {
                    setInvites([])
                }
            })
            .catch(() => {
                setInvites([]);
            }).finally(() => {
            setInvitesLoading(false)
        })
    }


    console.log(invites)

  useEffect(() => {
    authenticate().catch(() => {});

    // check if porter server is local (does not require email verification)
    api
      .getMetadata("", {}, {})
      .then((res) => {
        setLocal(!res.data?.provisioner);
      })
      .catch(() => {});
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  // return unauthenticated routes
  if (!isLoggedIn) {
    return (
      <>
        <Switch>
          <Route
            path="/login"
            render={() => {
              return <Login authenticate={authenticate} />;
            }}
          />
          <Route
            path="/register"
            render={() => {
              return <Register authenticate={authenticate} />;
            }}
          />
          <Route
            path="/password/reset/finalize"
            render={() => {
              return <ResetPasswordFinalize />;
            }}
          />
          <Route
            path="/password/reset"
            render={() => {
              return <ResetPasswordInit />;
            }}
          />
          <Route
            path="*"
            render={() => {
              return <Redirect to="/login" />;
            }}
          />
        </Switch>
        <CurrentError currentError={currentError} />
      </>
    );
  }

  // if logged in but not verified, block until email verification
  if (!local && !isEmailVerified) {
    return (
      <>
        <Switch>
          <Route
            path="/"
            render={() => {
              return <VerifyEmail handleLogOut={handleLogOut} />;
            }}
          />
        </Switch>
        <CurrentError currentError={currentError} />
      </>
    );
  }

  // Handle case where new user signs up via OAuth and has not set name and company
  if (!hasInfo && userId > 9312) {
    return (
      <>
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
        <CurrentError currentError={currentError} />
      </>
    );
  }

  return (
    <AuthnContext.Provider
      value={{
          userId,
          handleLogOut,
          session,
          invites,
          checkInvites,
          invitesLoading
      }}
    >
      {children}
    </AuthnContext.Provider>
  );
};

export default AuthnProvider;
