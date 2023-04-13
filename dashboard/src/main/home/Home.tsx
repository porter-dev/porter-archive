import React, { useEffect, useState, useContext, useRef } from "react";
import { Route, RouteComponentProps, Switch, withRouter } from "react-router";
import styled, { ThemeProvider } from "styled-components";
import { createPortal } from "react-dom";

import api from "shared/api";
import midnight from "shared/themes/midnight";
import standard from "shared/themes/standard";
import { Context } from "shared/Context";
import { PorterUrl, pushFiltered, pushQueryParams } from "shared/routing";
import { ClusterType, ProjectType } from "shared/types";

import ConfirmOverlay from "components/ConfirmOverlay";
import Loading from "components/Loading";
import DashboardRouter from "./cluster-dashboard/DashboardRouter";
import Dashboard from "./dashboard/Dashboard";
import Integrations from "./integrations/Integrations";
import LaunchWrapper from "./launch/LaunchWrapper";

import Navbar from "./navbar/Navbar";
import ProjectSettings from "./project-settings/ProjectSettings";
import Sidebar from "./sidebar/Sidebar";
import PageNotFound from "components/PageNotFound";
import AppDashboard from "./app-dashboard/AppDashboard";

import { fakeGuardedRoute } from "shared/auth/RouteGuard";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import discordLogo from "../../assets/discord.svg";
import Onboarding from "./onboarding/Onboarding";
import ModalHandler from "./ModalHandler";
import { NewProjectFC } from "./new-project/NewProject";
import InfrastructureRouter from "./infrastructure/InfrastructureRouter";
import { overrideInfraTabEnabled } from "utils/infrastructure";
import NoClusterPlaceHolder from "components/NoClusterPlaceHolder";

// Guarded components
const GuardedProjectSettings = fakeGuardedRoute("settings", "", [
  "get",
  "list",
  "update",
  "create",
  "delete",
])(ProjectSettings);

const GuardedIntegrations = fakeGuardedRoute("integrations", "", [
  "get",
  "list",
  "update",
  "create",
  "delete",
])(Integrations);

type Props = RouteComponentProps &
  WithAuthProps & {
    logOut: () => void;
    currentProject: ProjectType;
    currentCluster: ClusterType;
    currentRoute: PorterUrl;
  };

const Home: React.FC<Props> = (props) => {
  const {
    user,
    projects,
    currentCluster,
    currentProject,
    currentModal,
    currentOverlay,
    hasFinishedOnboarding,
    shouldRefreshClusters,
    setProjects,
    setCurrentProject,
    setCapabilities,
    setCanCreateProject,
    setHasFinishedOnboarding,
    setCurrentError,
    setCurrentModal,
    setHasBillingEnabled,
    setUsage,
    setShouldRefreshClusters,
  } = useContext(Context);

  const [showWelcome, setShowWelcome] = useState(false);
  const [forceRefreshClusters, setForceRefreshClusters] = useState(false);
  const [ghRedirect, setGhRedirect] = useState(false);
  const [forceSidebar, setForceSidebar] = useState(true);
  const [theme, setTheme] = useState(standard);

  const redirectToNewProject = () => {
    pushFiltered(props, "/new-project", ["project_id"]);
  };

  const redirectToOnboarding = () => {
    pushFiltered(props, "/onboarding", []);
  };

  const getMetadata = () => {
    api
      .getMetadata("<token>", {}, {})
      .then((res) => {
        setCapabilities(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getProjects = (id?: number) => {
    let { currentProject } = props;
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    let projectId = urlParams.get("project_id");
    if (!projectId && currentProject?.id) {
      pushQueryParams(props, { project_id: currentProject.id.toString() });
    }

    api
      .getProjects("<token>", {}, { id: user.userId })
      .then((res) => {
        if (res.data) {
          if (res.data.length === 0) {
            redirectToNewProject();
          } else if (res.data.length > 0 && !currentProject) {
            setProjects(res.data);

            let foundProject = null;
            if (id) {
              res.data.forEach((project: ProjectType, i: number) => {
                if (project.id === id) {
                  foundProject = project;
                }
              });
              setCurrentProject(foundProject || res.data[0]);
            }
            if (!foundProject) {
              res.data.forEach((project: ProjectType, i: number) => {
                if (
                  project.id.toString() ===
                  localStorage.getItem("currentProject")
                ) {
                  foundProject = project;
                }
              });
              setCurrentProject(foundProject || res.data[0]);
            }
          }
        }
      })
      .catch(console.log);
  };

  const checkIfCanCreateProject = () => {
    api
      .getCanCreateProject("<token>", {}, {})
      .then((res) => {
        if (res.status === 403) {
          setCanCreateProject(false);
          return;
        }
        setCanCreateProject(true);
      })
      .catch((err) => {
        setCanCreateProject(false);
        console.error(err);
      });
  };

  const checkOnboarding = async () => {
    try {
      const project_id = currentProject?.id;
      if (!project_id) {
        return;
      }
      const res = await api.getOnboardingState("<token>", {}, { project_id });

      if (res.status === 404) {
        setHasFinishedOnboarding(true);
        return;
      }

      if (res?.data && res?.data.current_step !== "clean_up") {
        setHasFinishedOnboarding(false);
      } else {
        setHasFinishedOnboarding(true);
      }
    } catch (error) {}
  };

  useEffect(() => {
    checkOnboarding();
    checkIfCanCreateProject();
    let { match } = props;

    // Handle redirect from DO
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);

    let err = urlParams.get("error");
    if (err) {
      setCurrentError(err);
    }

    let defaultProjectId = parseInt(urlParams.get("project_id"));

    setGhRedirect(urlParams.get("gh_oauth") !== null);
    urlParams.delete("gh_oauth");
    getProjects(defaultProjectId);
    getMetadata();

    if (
      !hasFinishedOnboarding &&
      props.history.location.pathname &&
      !props.history.location.pathname.includes("onboarding")
    ) {
      setCurrentModal("RedirectToOnboardingModal");
    }

    return () => {
      setCanCreateProject(false);
    };
  }, []);

  // Hacky legacy shim for remote cluster refresh until Context is properly split
  useEffect(() => {
    if (shouldRefreshClusters) {
      setForceRefreshClusters(true);
      setShouldRefreshClusters(false);
    }
  }, [shouldRefreshClusters]);

  const checkIfProjectHasBilling = async (projectId: number) => {
    if (!projectId) {
      return false;
    }
    try {
      const res = await api.getHasBilling(
        "<token>",
        {},
        { project_id: projectId }
      );
      setHasBillingEnabled(res.data?.has_billing);
      return res?.data?.has_billing;
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getMetadata();
    checkOnboarding();
    if (!process.env.DISABLE_BILLING) {
      checkIfProjectHasBilling(currentProject?.id)
        .then((isBillingEnabled) => {
          if (isBillingEnabled) {
            api
              .getUsage("<token>", {}, { project_id: currentProject?.id })
              .then((res) => {
                const usage = res.data;
                setUsage(usage);
                if (usage.exceeded && false) {
                  setCurrentModal("UsageWarningModal", { usage });
                }
              })
              .catch(console.log);
          }
        })
        .catch(console.log);
    }
  }, [props.currentProject?.id]);

  useEffect(() => {
    if (
      !hasFinishedOnboarding &&
      props.history.location.pathname &&
      !props.history.location.pathname.includes("onboarding") &&
      !props.history.location.pathname.includes("new-project") &&
      !props.history.location.pathname.includes("project-settings")
    ) {
      setCurrentModal("RedirectToOnboardingModal");
    }
  }, [props.match.url]);

  const prevCurrentCluster: any = useRef();
  useEffect(() => {
    if (!prevCurrentCluster.current && props.currentCluster) {
      getMetadata();
    }

    // Store previous value (legacy retrofit)
    prevCurrentCluster.current = props.currentCluster;
  }, [props.currentCluster]);

  const projectOverlayCall = async () => {
    try {
      const res = await api.getProjects("<token>", {}, { id: user.userId });
      if (!res.data) {
        setCurrentModal(null, null);
        return;
      }

      setProjects(res.data);
      if (!res.data.length) {
        setCurrentProject(null, () => redirectToNewProject());
      } else {
        setCurrentProject(res.data[0]);
      }
      setCurrentModal(null, null);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async () => {
    localStorage.removeItem(currentProject.id + "-cluster");
    try {
      await api.deleteProject("<token>", {}, { id: currentProject?.id });
      projectOverlayCall();
    } catch (error) {
      console.log(error);
    }

    try {
      const res = await api.getClusters<
        {
          infra_id?: number;
          name: string;
        }[]
      >("<token>", {}, { id: currentProject?.id });

      const destroyInfraPromises = res.data.map((cluster) => {
        if (!cluster.infra_id) {
          return undefined;
        }

        return api.destroyInfra(
          "<token>",
          {},
          { project_id: currentProject.id, infra_id: cluster.infra_id }
        );
      });

      await Promise.all(destroyInfraPromises);
    } catch (error) {
      console.log(error);
    }
    setCurrentModal(null, null);
    pushFiltered(props, "/dashboard", []);
  };

  const { cluster, baseRoute } = props.match.params as any;
  return (
    <ThemeProvider theme={currentProject?.simplified_view_enabled ? midnight : standard}>
      <StyledHome>
        <ModalHandler setRefreshClusters={setForceRefreshClusters} />
        {currentOverlay &&
          createPortal(
            <ConfirmOverlay
              show={true}
              message={currentOverlay.message}
              onYes={currentOverlay.onYes}
              onNo={currentOverlay.onNo}
            />,
            document.body
          )}
        {/* Render sidebar when there's at least one project */}
        {projects?.length > 0 && baseRoute !== "new-project" ? (
          <Sidebar
            key="sidebar"
            forceSidebar={forceSidebar}
            setWelcome={setShowWelcome}
            currentView={props.currentRoute}
            forceRefreshClusters={forceRefreshClusters}
            setRefreshClusters={setForceRefreshClusters}
          />
        ) : (
          <DiscordButton href="https://discord.gg/34n7NN7FJ7" target="_blank">
            <Icon src={discordLogo} />
            Join Our Discord
          </DiscordButton>
        )}
        <ViewWrapper id="HomeViewWrapper">
          <Navbar
            logOut={props.logOut}
            currentView={props.currentRoute} // For form feedback
          />

          <Switch>
            <Route
              path="/apps"
            >
              <AppDashboard />
            </Route>
            <Route
              path="/addons"
            >
              test
            </Route>
            <Route
              path="/new-project"
              render={() => {
                return <NewProjectFC />;
              }}
            ></Route>
            <Route
              path="/onboarding"
              render={() => {
                return <Onboarding />;
              }}
            />
            {(user?.isPorterUser ||
              overrideInfraTabEnabled({
                projectID: currentProject?.id,
              })) && (
              <Route
                path="/infrastructure"
                render={() => {
                  return (
                    <DashboardWrapper>
                      <InfrastructureRouter />
                    </DashboardWrapper>
                  );
                }}
              />
            )}
            <Route
            path={[
              "/cluster-dashboard",
              "/applications",
              "/jobs",
              "/env-groups",
              "/databases",
              "/preview-environments",
              "/stacks",
            ]}
            render={() => {
              if (currentCluster?.id === -1) {
                return <Loading />;
              } else if (!currentCluster || !currentCluster.name) {
                return (
                  <DashboardWrapper>
                    <NoClusterPlaceHolder></NoClusterPlaceHolder>
                  </DashboardWrapper>
                );
              }
              return (
                <DashboardWrapper>
                  <DashboardRouter
                    currentCluster={currentCluster}
                    setSidebar={setForceSidebar}
                    currentView={props.currentRoute}
                  />
                </DashboardWrapper>
              );
            }}
          />
            <Route
              path={"/integrations"}
              render={() => <GuardedIntegrations />}
            />
            <Route
              path={"/project-settings"}
              render={() => <GuardedProjectSettings />}
            />
            <Route path={"*"} render={() => <LaunchWrapper />} />
          </Switch>
        </ViewWrapper>
        {createPortal(
          <ConfirmOverlay
            show={currentModal === "UpdateProjectModal"}
            message={
              currentProject
                ? `Are you sure you want to delete ${currentProject.name}?`
                : ""
            }
            onYes={handleDelete}
            onNo={() => setCurrentModal(null, null)}
          />,
          document.body
        )}
      </StyledHome>
    </ThemeProvider>
  );
};

export default withRouter(withAuth(Home));

const ViewWrapper = styled.div`
  height: 100%;
  width: 100vw;
  padding: 45px;
  display: flex;
  flex: 1;
  overflow-y: auto;
  justify-content: center;
  background: ${(props) => props.theme.bg};
  position: relative;
`;

const DashboardWrapper = styled.div`
  width: 100%;
  min-width: 300px;
  height: fit-content;
`;

const StyledHome = styled.div`
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  margin: 0;
  user-select: none;
  display: flex;
  justify-content: center;

  @keyframes floatInModal {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const DiscordButton = styled.a`
  position: absolute;
  z-index: 1;
  text-decoration: none;
  bottom: 17px;
  display: flex;
  align-items: center;
  width: 170px;
  left: 15px;
  border: 2px solid #ffffff44;
  border-radius: 3px;
  color: #ffffff44;
  height: 40px;
  font-family: Work Sans, sans-serif;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  :hover {
    > img {
      opacity: 60%;
    }
    color: #ffffff88;
    border-color: #ffffff88;
  }
`;

const Icon = styled.img`
  height: 25px;
  width: 25px;
  opacity: 30%;
  margin-left: 7px;
  margin-right: 5px;
`;
