import React, {useContext, useEffect, useMemo, useState} from "react";

import api from "shared/api";
import { Context } from "shared/Context";

import { Configuration, FrontendApi, Session, Identity } from "@ory/client"
import {useQuery} from "@tanstack/react-query";
import {clusterStateValidator} from "../../lib/clusters/types";
import {Invite, inviteValidator} from "../../lib/invites/types";
import {z} from "zod";

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
  isLoggedIn: boolean;
  isEmailVerified: boolean;
  handleLogOut: () => void;
  authenticate: () => void;
  isLoading: boolean;
  hasInfo: boolean;
  session: Session | null;
  invites: Invite[];
  checkInvites: () => void;
  invitesLoading: boolean;
};

export const AuthnContext = React.createContext<AuthnState>({} as AuthnState);

const AuthnProvider = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { setUser, clearContext, setCurrentError } = useContext(Context);
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


    console.log(invites)

    const authenticate = (): void => {
    api
      .checkAuth("", {}, {})
      .then((res) => {
        if (res?.data) {
          setUser(res.data.id, res.data.email);
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
                .then(({ data }) => {

                    // Create a logout url
                    ory.createBrowserLogoutFlow().then(({ data }) => {
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
