import React, { Component } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import { PorterUrl } from "shared/routing";
import { ClusterType, ProjectType } from "shared/types";

import ConfirmOverlay from "components/ConfirmOverlay";
import Loading from "components/Loading";
import ClusterDashboard from "./cluster-dashboard/ClusterDashboard";
import Dashboard from "./dashboard/Dashboard";
import Integrations from "./integrations/Integrations";
import Templates from "./launch/Launch";
import ClusterInstructionsModal from "./modals/ClusterInstructionsModal";
import IntegrationsInstructionsModal from "./modals/IntegrationsInstructionsModal";
import IntegrationsModal from "./modals/IntegrationsModal";
import Modal from "./modals/Modal";
import UpdateClusterModal from "./modals/UpdateClusterModal";
import Navbar from "./navbar/Navbar";
import NewProject from "./new-project/NewProject";
import ProjectSettings from "./project-settings/ProjectSettings";
import Sidebar from "./sidebar/Sidebar";

type PropsType = RouteComponentProps & {
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
};

// TODO: Handle cluster connected but with some failed infras (no successful set)
class Home extends Component<PropsType, StateType> {
  state = {
    forceSidebar: true,
    showWelcome: false,
    prevProjectId: null as number | null,
    forceRefreshClusters: false,
    sidebarReady: false,
    handleDO: false,
    ghRedirect: false,
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
          this.props.history.push("dashboard?tab=provisioner");
        } else if (this.state.ghRedirect) {
          this.props.history.push("integrations");
          this.setState({ ghRedirect: false });
        }
      });
  };

  getProjects = (id?: number) => {
    let { user, setProjects } = this.context;
    let { currentProject } = this.props;
    api
      .getProjects("<token>", {}, { id: user.userId })
      .then((res) => {
        if (res.data) {
          if (res.data.length === 0) {
            this.props.history.push("new-project");
          } else if (res.data.length > 0 && !currentProject) {
            setProjects(res.data);

            let foundProject = null;
            if (id) {
              res.data.forEach((project: ProjectType, i: number) => {
                if (project.id === id) {
                  foundProject = project;
                }
              });
              this.context.setCurrentProject(foundProject);
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
              this.context.setCurrentProject(
                foundProject ? foundProject : res.data[0]
              );
              this.initializeView();
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

  provisionDOKS = async (integrationId: number, region: string) => {
    console.log("Provisioning DOKS...");
    await api.createDOKS(
      "<token>",
      {
        do_integration_id: integrationId,
        doks_name: this.props.currentProject.name,
        do_region: region,
      },
      {
        project_id: this.props.currentProject.id,
      }
    );
    return this.props.history.push("dashboard?tab=provisioner");
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
          let infras = urlParams.getAll("infras");
          if (infras.length === 2) {
            this.provisionDOCR(tgtIntegration.id, tier, () => {
              this.provisionDOKS(tgtIntegration.id, region);
            });
          } else if (infras[0] === "docr") {
            this.provisionDOCR(tgtIntegration.id, tier, () => {
              this.props.history.push("dashboard?tab=provisioner");
            });
          } else {
            this.provisionDOKS(tgtIntegration.id, region);
          }
        })
        .catch(console.log);
      this.setState({ handleDO: false });
    }
  };

  componentDidMount() {
    // Handle redirect from DO
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);

    let err = urlParams.get("error");
    if (err) {
      this.context.setCurrentError(err);
    }

    let provision = urlParams.get("provision");
    let defaultProjectId = null;
    if (provision === "do") {
      defaultProjectId = parseInt(urlParams.get("project_id"));
      this.setState({ handleDO: true });
      this.checkDO();
    }

    this.setState({ ghRedirect: urlParams.get("gh_oauth") !== null });
    urlParams.delete("gh_oauth");
    this.getProjects(defaultProjectId);
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
      }
    }
  }

  // TODO: move into ClusterDashboard
  renderDashboard = () => {
    let { currentCluster, setCurrentModal } = this.context;
    if (currentCluster && !currentCluster.name) {
      return (
        <DashboardWrapper>
          <Placeholder>
            <Bold>Porter - Getting Started</Bold>
            <br />
            <br />
            1. Navigate to{" "}
            <A onClick={() => setCurrentModal("ClusterConfigModal")}>
              + Add a Cluster
            </A>{" "}
            and provide a kubeconfig. *<br />
            <br />
            2. Choose which contexts you would like to use from the{" "}
            <A
              onClick={() => {
                setCurrentModal("ClusterConfigModal", { currentTab: "select" });
              }}
            >
              Select Clusters
            </A>{" "}
            tab.
            <br />
            <br />
            3. For additional information, please refer to our <A>docs</A>.
            <br />
            <br />
            <br />* Make sure all fields are explicitly declared (e.g., certs
            and keys).
          </Placeholder>
        </DashboardWrapper>
      );
    } else if (!currentCluster) {
      return <Loading />;
    }

    return (
      <DashboardWrapper>
        <ClusterDashboard
          currentCluster={currentCluster}
          setSidebar={(x: boolean) => this.setState({ forceSidebar: x })}
          // setCurrentView={(x: string) => this.setState({ currentView: x })}
        />
      </DashboardWrapper>
    );
  };

  renderContents = () => {
    let currentView = this.props.currentRoute;
    if (this.context.currentProject && currentView !== "new-project") {
      if (currentView === "cluster-dashboard") {
        return this.renderDashboard();
      } else if (currentView === "dashboard") {
        return (
          <DashboardWrapper>
            <Dashboard projectId={this.context.currentProject?.id} />
          </DashboardWrapper>
        );
      } else if (currentView === "integrations") {
        return <Integrations />;
      } else if (currentView === "project-settings") {
        return <ProjectSettings />;
      }

      return <Templates />;
    } else if (currentView === "new-project") {
      return <NewProject />;
    }
  };

  renderSidebar = () => {
    if (this.context.projects.length > 0) {
      return (
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
      );
    }
  };

  projectOverlayCall = () => {
    let { user, setProjects } = this.context;
    api
      .getProjects("<token>", {}, { id: user.userId })
      .then((res) => {
        if (res.data) {
          setProjects(res.data);
          if (res.data.length > 0) {
            this.context.setCurrentProject(res.data[0]);
          } else {
            this.context.setCurrentProject(null);
            this.props.history.push("new-project");
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
          switch (cluster.service) {
            case "eks":
              api
                .destroyEKS(
                  "<token>",
                  { eks_name: cluster.name },
                  {
                    project_id: currentProject.id,
                    infra_id: cluster.infra_id,
                  }
                )
                .then(() =>
                  console.log("destroyed provisioned infra:", cluster.infra_id)
                )
                .catch(console.log);
              break;

            case "gke":
              api
                .destroyGKE(
                  "<token>",
                  { gke_name: cluster.name },
                  {
                    project_id: currentProject.id,
                    infra_id: cluster.infra_id,
                  }
                )
                .then(() =>
                  console.log("destroyed provisioned infra:", cluster.infra_id)
                )
                .catch(console.log);
              break;

            case "doks":
              api
                .destroyDOKS(
                  "<token>",
                  { doks_name: cluster.name },
                  {
                    project_id: currentProject.id,
                    infra_id: cluster.infra_id,
                  }
                )
                .then(() =>
                  console.log("destroyed provisioned infra:", cluster.infra_id)
                )
                .catch(console.log);
              break;
          }
        }
      })
      .catch(console.log);
    setCurrentModal(null, null);
    this.props.history.push("dashboard?tab=overview");
  };

  render() {
    let { currentModal, setCurrentModal, currentProject } = this.context;

    return (
      <StyledHome>
        {currentModal === "ClusterInstructionsModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="760px"
            height="650px"
          >
            <ClusterInstructionsModal />
          </Modal>
        )}
        {currentModal === "UpdateClusterModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="565px"
            height="275px"
          >
            <UpdateClusterModal
              setRefreshClusters={(x: boolean) =>
                this.setState({ forceRefreshClusters: x })
              }
            />
          </Modal>
        )}
        {currentModal === "IntegrationsModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="760px"
            height="725px"
          >
            <IntegrationsModal />
          </Modal>
        )}
        {currentModal === "IntegrationsInstructionsModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="760px"
            height="650px"
          >
            <IntegrationsInstructionsModal />
          </Modal>
        )}

        {this.renderSidebar()}

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

export default withRouter(Home);

const ViewWrapper = styled.div`
  height: 100%;
  width: 100vw;
  padding-top: 30px;
  overflow-y: auto;
  display: flex;
  flex: 1;
  justify-content: center;
  background: #202227;
  position: relative;
`;

const DashboardWrapper = styled.div`
  width: 80%;
  padding-top: 50px;
  min-width: 300px;
  padding-bottom: 120px;
`;

const A = styled.a`
  color: #ffffff;
  text-decoration: underline;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
`;

const Placeholder = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #6f6f6f;
  font-size: 16px;
  margin-left: 20px;
  margin-top: 24vh;
  user-select: none;
`;

const Bold = styled.div`
  font-weight: bold;
  font-size: 20px;
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
