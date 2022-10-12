import React, { Component } from "react";
import { Route, RouteComponentProps, Switch, withRouter } from "react-router";
import styled from "styled-components";

import api from "shared/api";
import { H } from "highlight.run";
import { Context } from "shared/Context";
import { PorterUrl, pushFiltered, pushQueryParams } from "shared/routing";
import { ClusterType, ProjectType } from "shared/types";

import ConfirmOverlay from "components/ConfirmOverlay";
import Loading from "components/Loading";
import ClusterDashboard from "./cluster-dashboard/ClusterDashboard";
import Dashboard from "./dashboard/Dashboard";
import WelcomeForm from "./WelcomeForm";
import Integrations from "./integrations/Integrations";
import LaunchWrapper from "./launch/LaunchWrapper";

import Navbar from "./navbar/Navbar";
import ProjectSettings from "./project-settings/ProjectSettings";
import Sidebar from "./sidebar/Sidebar";
import PageNotFound from "components/PageNotFound";

import { fakeGuardedRoute } from "shared/auth/RouteGuard";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import discordLogo from "../../assets/discord.svg";
import Onboarding from "./onboarding/Onboarding";
import ModalHandler from "./ModalHandler";
import { NewProjectFC } from "./new-project/NewProject";
import InfrastructureRouter from "./infrastructure/InfrastructureRouter";

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

type PropsType = RouteComponentProps &
  WithAuthProps & {
    logOut: () => void;
    currentProject: ProjectType;
    currentCluster: ClusterType;
    currentRoute: PorterUrl;
  };

type StateType = {
  forceSidebar: boolean;
  showWelcome: boolean;
  handleDO: boolean; // Trigger DO infra calls after oauth flow if needed
  ghRedirect: boolean;
  forceRefreshClusters: boolean; // For updating ClusterSection from modal on deletion

  // Track last project id for refreshing clusters on project change
  prevProjectId: number | null;
  showWelcomeForm: boolean;
};

// TODO: Handle cluster connected but with some failed infras (no successful set)
// TODO: Set up current view / sidebar tab as dynamic Routes
class Home extends Component<PropsType, StateType> {
  state = {
    forceSidebar: true,
    showWelcome: false,
    prevProjectId: null as number | null,
    forceRefreshClusters: false,
    sidebarReady: false,
    handleDO: false,
    ghRedirect: false,
    showWelcomeForm: true,
  };

  getMetadata = () => {
    api
      .getMetadata("<token>", {}, {})
      .then((res) => {
        this.context.setCapabilities(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  getProjects = (id?: number) => {
    let { user, setProjects, setCurrentProject } = this.context;
    let { currentProject } = this.props;
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    let projectId = urlParams.get("project_id");
    if (!projectId && currentProject?.id) {
      pushQueryParams(this.props, { project_id: currentProject.id.toString() });
    }

    api
      .getProjects("<token>", {}, { id: user.userId })
      .then((res) => {
        if (res.data) {
          if (res.data.length === 0) {
            this.redirectToNewProject();
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

  checkIfCanCreateProject = () => {
    api
      .getCanCreateProject("<token>", {}, {})
      .then((res) => {
        if (res.status === 403) {
          this.context.setCanCreateProject(false);
          return;
        }
        this.context.setCanCreateProject(true);
      })
      .catch((err) => {
        this.context.setCanCreateProject(false);
        console.error(err);
      });
  };

  componentDidMount() {
    this.checkOnboarding();
    this.checkIfCanCreateProject();
    let { match } = this.props;

    let { user } = this.context;

    // Initialize Highlight
    if (
      window.location.href.includes("dashboard.getporter.dev") &&
      !user.email.includes("@getporter.dev")
    ) {
      H.init("y2d13lgr");
      H.identify(user.email, { id: user.id });
    }

    // Handle redirect from DO
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);

    let err = urlParams.get("error");
    if (err) {
      this.context.setCurrentError(err);
    }

    let defaultProjectId = parseInt(urlParams.get("project_id"));

    this.setState({ ghRedirect: urlParams.get("gh_oauth") !== null });
    urlParams.delete("gh_oauth");
    this.getProjects(defaultProjectId);
    this.getMetadata();

    if (
      !this.context.hasFinishedOnboarding &&
      this.props.history.location.pathname &&
      !this.props.history.location.pathname.includes("onboarding")
    ) {
      this.context.setCurrentModal("RedirectToOnboardingModal");
    }
  }

  componentWillUnmount(): void {
    this.context.setCanCreateProject(false);
  }

  async checkIfProjectHasBilling(projectId: number) {
    if (!projectId) {
      return false;
    }
    try {
      const res = await api.getHasBilling(
        "<token>",
        {},
        { project_id: projectId }
      );
      this.context.setHasBillingEnabled(res.data?.has_billing);
      return res?.data?.has_billing;
    } catch (error) {
      console.log(error);
    }
  }

  async checkOnboarding() {
    try {
      const project_id = this.context?.currentProject?.id;
      if (!project_id) {
        return;
      }
      const res = await api.getOnboardingState("<token>", {}, { project_id });

      if (res.status === 404) {
        this.context.setHasFinishedOnboarding(true);
        return;
      }

      if (res?.data && res?.data.current_step !== "clean_up") {
        this.context.setHasFinishedOnboarding(false);
      } else {
        this.context.setHasFinishedOnboarding(true);
      }
    } catch (error) {}
  }

  // TODO: Need to handle the following cases. Do a deep rearchitecture (Prov -> Dashboard?) if need be:
  // 1. Make sure clicking cluster in drawer shows cluster-dashboard
  // 2. Make sure switching projects shows appropriate initial view (dashboard || provisioner)
  // 3. Make sure initializing from URL (DO oauth) displays the appropriate initial view
  componentDidUpdate(prevProps: PropsType) {
    if (
      !this.context.hasFinishedOnboarding &&
      prevProps.match.url !== this.props.match.url &&
      this.props.history.location.pathname &&
      !this.props.history.location.pathname.includes("onboarding") &&
      !this.props.history.location.pathname.includes("new-project") &&
      !this.props.history.location.pathname.includes("project-settings")
    ) {
      this.context.setCurrentModal("RedirectToOnboardingModal");
    }

    if (prevProps.currentProject?.id !== this.props.currentProject?.id) {
      this.checkOnboarding();

      if (!process.env.DISABLE_BILLING) {
        this.checkIfProjectHasBilling(this?.context?.currentProject?.id)
          .then((isBillingEnabled) => {
            if (isBillingEnabled) {
              api
                .getUsage(
                  "<token>",
                  {},
                  { project_id: this.context?.currentProject?.id }
                )
                .then((res) => {
                  const usage = res.data;
                  this.context.setUsage(usage);
                  if (usage.exceeded) {
                    this.context.setCurrentModal("UsageWarningModal", {
                      usage,
                    });
                  }
                })
                .catch(console.log);
            }
          })
          .catch(console.log);
      }
    }

    if (
      prevProps.currentProject !== this.props.currentProject ||
      (!prevProps.currentCluster && this.props.currentCluster)
    ) {
      this.getMetadata();
    }
  }

  projectOverlayCall = async () => {
    let { user, setProjects, setCurrentProject } = this.context;
    try {
      const res = await api.getProjects("<token>", {}, { id: user.userId });
      if (!res.data) {
        this.context.setCurrentModal(null, null);
        return;
      }

      setProjects(res.data);
      if (!res.data.length) {
        setCurrentProject(null, () => this.redirectToNewProject());
      } else {
        setCurrentProject(res.data[0]);
      }
      this.context.setCurrentModal(null, null);
    } catch (error) {
      /** @todo Centralize with error handler */
      console.log(error);
    }
  };

  handleDelete = async () => {
    let { setCurrentModal, currentProject } = this.context;
    localStorage.removeItem(currentProject.id + "-cluster");
    try {
      await api.deleteProject("<token>", {}, { id: currentProject?.id });
      this.projectOverlayCall();
    } catch (error) {
      /** @todo Centralize with error handler */
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
    pushFiltered(this.props, "/dashboard", []);
  };

  redirectToNewProject = () => {
    pushFiltered(this.props, "/new-project", ["project_id"]);
  };

  redirectToOnboarding = () => {
    pushFiltered(this.props, "/onboarding", []);
  };

  render() {
    let {
      currentModal,
      setCurrentModal,
      currentProject,
      currentOverlay,
      projects,
    } = this.context;

    const { cluster, baseRoute } = this.props.match.params as any;
    return (
      <StyledHome>
        <ModalHandler
          setRefreshClusters={(x) => this.setState({ forceRefreshClusters: x })}
        />
        {currentOverlay && (
          <ConfirmOverlay
            show={true}
            message={currentOverlay.message}
            onYes={currentOverlay.onYes}
            onNo={currentOverlay.onNo}
          />
        )}

        {/* Render sidebar when there's at least one project */}
        {projects?.length > 0 && baseRoute !== "new-project" ? (
          <Sidebar
            key="sidebar"
            forceSidebar={this.state.forceSidebar}
            setWelcome={(x: boolean) => this.setState({ showWelcome: x })}
            currentView={this.props.currentRoute}
            forceRefreshClusters={this.state.forceRefreshClusters}
            setRefreshClusters={(x: boolean) =>
              this.setState({ forceRefreshClusters: x })
            }
          />
        ) : (
          <>
            <DiscordButton href="https://discord.gg/34n7NN7FJ7" target="_blank">
              <Icon src={discordLogo} />
              Join Our Discord
            </DiscordButton>
            {/* This should only be shown on the first render of the app */}
            {/* this.state.showWelcomeForm &&
              localStorage.getItem("welcomed") != "true" &&
              projects?.length === 0 && (
                <>
                  <WelcomeForm
                    closeForm={() => this.setState({ showWelcomeForm: false })}
                  />
                  <Navbar
                    logOut={this.props.logOut}
                    currentView={this.props.currentRoute} // For form feedback
                  />
                </>
              ) */}
          </>
        )}

        <ViewWrapper id="HomeViewWrapper">
          <Navbar
            logOut={this.props.logOut}
            currentView={this.props.currentRoute} // For form feedback
          />

          <Switch>
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
            <Route
              path="/dashboard"
              render={() => {
                return (
                  <DashboardWrapper>
                    <Dashboard
                      projectId={this.context.currentProject?.id}
                      setRefreshClusters={(x: boolean) =>
                        this.setState({ forceRefreshClusters: x })
                      }
                    />
                  </DashboardWrapper>
                );
              }}
            />
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
                let { currentCluster } = this.context;
                if (currentCluster?.id === -1) {
                  return <Loading />;
                } else if (!currentCluster || !currentCluster.name) {
                  return (
                    <DashboardWrapper>
                      <PageNotFound />
                    </DashboardWrapper>
                  );
                }
                return (
                  <DashboardWrapper>
                    <ClusterDashboard
                      currentCluster={currentCluster}
                      setSidebar={(x: boolean) =>
                        this.setState({ forceSidebar: x })
                      }
                      currentView={this.props.currentRoute}
                      // setCurrentView={(x: string) => this.setState({ currentView: x })}
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

        <ConfirmOverlay
          show={currentModal === "UpdateProjectModal"}
          message={
            currentProject
              ? `Are you sure you want to delete ${currentProject.name}?`
              : ""
          }
          onYes={this.handleDelete}
          onNo={() => setCurrentModal(null, null)}
        />
      </StyledHome>
    );
  }
}

Home.contextType = Context;

export default withRouter(withAuth(Home));

const ViewWrapper = styled.div`
  height: 100%;
  width: 100vw;
  padding: 45px;
  overflow-y: auto;
  display: flex;
  flex: 1;
  justify-content: center;
  background: #202227;
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
