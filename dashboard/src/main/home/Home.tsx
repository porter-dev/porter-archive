import React, { Component } from "react";
import { RouteComponentProps, Switch, withRouter } from "react-router";
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
import Templates from "./launch/Launch";

import Navbar from "./navbar/Navbar";
import ProjectSettings from "./project-settings/ProjectSettings";
import Sidebar from "./sidebar/Sidebar";
import PageNotFound from "components/PageNotFound";

import { fakeGuardedRoute } from "shared/auth/RouteGuard";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import discordLogo from "../../assets/discord.svg";
import Onboarding from "./onboarding/Onboarding";
import ModalHandler from "./ModalHandler";

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

  // TODO: Refactor and prevent flash + multiple reload
  initializeView = () => {
    let { currentProject } = this.props;

    if (!currentProject) return;

    api
      .getInfra(
        "<token>",
        {},
        {
          project_id: currentProject.id,
        }
      )
      .then((res) => {
        let creating = false;

        for (var i = 0; i < res.data.length; i++) {
          creating = res.data[i].status === "creating";
        }
        if (creating) {
          pushFiltered(this.props, "/dashboard", ["project_id"], {
            tab: "provisioner",
          });
        } else if (this.state.ghRedirect) {
          pushFiltered(this.props, "/integrations", ["project_id"]);
          this.setState({ ghRedirect: false });
        }
      });
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
            pushFiltered(this.props, "/new-project", ["project_id"]);
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
              setCurrentProject(foundProject || res.data[0], () =>
                this.initializeView()
              );
            }
          }
        }
      })
      .catch(console.log);
  };

  provisionDOCR = async (
    integrationId: number,
    tier: string,
    callback?: any
  ) => {
    console.log("Provisioning DOCR...");
    await api.createDOCR(
      "<token>",
      {
        do_integration_id: integrationId,
        docr_name: this.props.currentProject.name,
        docr_subscription_tier: tier,
      },
      {
        project_id: this.props.currentProject.id,
      }
    );
    return callback();
  };

  provisionDOKS = async (
    integrationId: number,
    region: string,
    clusterName: string
  ) => {
    console.log("Provisioning DOKS...");
    await api.createDOKS(
      "<token>",
      {
        do_integration_id: integrationId,
        doks_name: clusterName,
        do_region: region,
      },
      {
        project_id: this.props.currentProject.id,
      }
    );
    return pushFiltered(this.props, "/dashboard", ["project_id"], {
      tab: "provisioner",
    });
  };

  checkDO = () => {
    let { currentProject } = this.props;
    if (this.state.handleDO && currentProject?.id) {
      api
        .getOAuthIds(
          "<token>",
          {},
          {
            project_id: currentProject.id,
          }
        )
        .then((res) => {
          let tgtIntegration = res.data.find((integration: any) => {
            return integration.client === "do";
          });
          let queryString = window.location.search;
          let urlParams = new URLSearchParams(queryString);
          let tier = urlParams.get("tier");
          let region = urlParams.get("region");
          let clusterName = urlParams.get("cluster_name");
          let infras = urlParams.getAll("infras");
          if (infras.length === 2) {
            this.provisionDOCR(tgtIntegration.id, tier, () => {
              this.provisionDOKS(tgtIntegration.id, region, clusterName);
            });
          } else if (infras[0] === "docr") {
            this.provisionDOCR(tgtIntegration.id, tier, () => {
              pushFiltered(this.props, "/dashboard", ["project_id"], {
                tab: "provisioner",
              });
            });
          } else {
            this.provisionDOKS(tgtIntegration.id, region, clusterName);
          }
        })
        .catch(console.log);
      this.setState({ handleDO: false });
    }
  };

  componentDidMount() {
    let { match } = this.props;
    let params = match.params as any;
    let { cluster } = params;

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

    let provision = urlParams.get("provision");
    let defaultProjectId = parseInt(urlParams.get("project_id"));
    if (provision === "do") {
      this.setState({ handleDO: true });
      this.checkDO();
    }

    this.setState({ ghRedirect: urlParams.get("gh_oauth") !== null });
    urlParams.delete("gh_oauth");
    this.getProjects(defaultProjectId);
    this.getMetadata();
  }

  // TODO: Need to handle the following cases. Do a deep rearchitecture (Prov -> Dashboard?) if need be:
  // 1. Make sure clicking cluster in drawer shows cluster-dashboard
  // 2. Make sure switching projects shows appropriate initial view (dashboard || provisioner)
  // 3. Make sure initializing from URL (DO oauth) displays the appropriate initial view
  componentDidUpdate(prevProps: PropsType) {
    if (
      prevProps.currentProject !== this.props.currentProject ||
      (!prevProps.currentCluster && this.props.currentCluster)
    ) {
      if (this.state.handleDO) {
        this.checkDO();
      } else {
        this.initializeView();
        this.getMetadata();
      }
    }
  }

  // TODO: move into ClusterDashboard
  renderDashboard = () => {
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
          setSidebar={(x: boolean) => this.setState({ forceSidebar: x })}
          currentView={this.props.currentRoute}
          // setCurrentView={(x: string) => this.setState({ currentView: x })}
        />
      </DashboardWrapper>
    );
  };

  renderContents = () => {
    let currentView = this.props.currentRoute;
    console.log({ currentView });

    if (this.context.currentProject && currentView !== "onboarding") {
      if (
        currentView === "cluster-dashboard" ||
        currentView === "applications" ||
        currentView === "jobs" ||
        currentView === "env-groups"
      ) {
        return this.renderDashboard();
      } else if (currentView === "dashboard") {
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
      } else if (currentView === "integrations") {
        return <GuardedIntegrations />;
      } else if (currentView === "project-settings") {
        return <GuardedProjectSettings />;
      }
      return <Templates />;
    } else if (currentView === "onboarding") {
      return <Onboarding />;
    }
  };

  projectOverlayCall = () => {
    let { user, setProjects, setCurrentProject } = this.context;
    api
      .getProjects("<token>", {}, { id: user.userId })
      .then((res) => {
        if (res.data) {
          setProjects(res.data);
          if (res.data.length > 0) {
            setCurrentProject(res.data[0]);
          } else {
            setCurrentProject(null, () =>
              pushFiltered(this.props, "/new-project", ["project_id"])
            );
          }
          this.context.setCurrentModal(null, null);
        }
      })
      .catch(console.log);
  };

  handleDelete = () => {
    let { setCurrentModal, currentProject } = this.context;
    localStorage.removeItem(currentProject.id + "-cluster");
    api
      .deleteProject("<token>", {}, { id: currentProject.id })
      .then(this.projectOverlayCall)
      .catch(console.log);

    // Loop through and delete infra of all clusters we've provisioned
    api
      .getClusters("<token>", {}, { id: currentProject.id })
      .then((res) => {
        // TODO: promise.map
        for (var i = 0; i < res.data.length; i++) {
          let cluster = res.data[i];
          if (!cluster.infra_id) continue;

          // Handle destroying infra we've provisioned
          api
            .destroyInfra(
              "<token>",
              { name: cluster.name },
              {
                project_id: currentProject.id,
                infra_id: cluster.infra_id,
              }
            )
            .then(() =>
              console.log("destroyed provisioned infra:", cluster.infra_id)
            )
            .catch(console.log);
        }
      })
      .catch(console.log);
    setCurrentModal(null, null);
    pushFiltered(this.props, "/dashboard", []);
  };

  render() {
    let {
      currentModal,
      setCurrentModal,
      currentProject,
      currentOverlay,
      projects,
    } = this.context;

    const { cluster } = this.props.match.params as any;
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
        {projects?.length > 0 && cluster !== "new-project" ? (
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
            {this.state.showWelcomeForm &&
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
              )}
          </>
        )}

        <ViewWrapper>
          <Navbar
            logOut={this.props.logOut}
            currentView={this.props.currentRoute} // For form feedback
          />
          {this.renderContents()}
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
  padding-top: 10vh;
  overflow-y: auto;
  display: flex;
  flex: 1;
  justify-content: center;
  background: #202227;
  position: relative;
`;

const DashboardWrapper = styled.div`
  width: calc(85%);
  min-width: 300px;
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
