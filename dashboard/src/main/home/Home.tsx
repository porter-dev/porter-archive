import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../shared/Context';
import api from '../../shared/api';
import { InfraType, ClusterType } from '../../shared/types';

import Sidebar from './sidebar/Sidebar';
import Dashboard from './dashboard/Dashboard';
import ClusterDashboard from './cluster-dashboard/ClusterDashboard';
import Loading from '../../components/Loading';
import Templates from './templates/Templates';
import Integrations from "./integrations/Integrations";
import UpdateClusterModal from './modals/UpdateClusterModal';
import ClusterInstructionsModal from './modals/ClusterInstructionsModal';
import IntegrationsModal from './modals/IntegrationsModal';
import IntegrationsInstructionsModal from './modals/IntegrationsInstructionsModal';
import NewProject from './new-project/NewProject';
import Navbar from './navbar/Navbar';
import Provisioner from './new-project/Provisioner';
import ProjectSettings from './project-settings/ProjectSettings';
import posthog from 'posthog-js';
import ConfirmOverlay from '../../components/ConfirmOverlay';
import Modal from './modals/Modal';

type PropsType = {
  logOut: () => void
};

type StateType = {
  forceSidebar: boolean,
  showWelcome: boolean,
  currentView: string,
  viewData: any[],
  forceRefreshClusters: boolean, // For updating ClusterSection from modal on deletion

  // Track last project id for refreshing clusters on project change
  prevProjectId: number | null,
  sidebarReady: boolean, // Fixes error where ~1/3 times reloading to provisioner fails
};

export default class Home extends Component<PropsType, StateType> {
  state = {
    forceSidebar: true,
    showWelcome: false,
    currentView: 'dashboard',
    prevProjectId: null as number | null,
    viewData: null as any,
    forceRefreshClusters: false,
    sidebarReady: false,
  }

  // Possibly consolidate into context (w/ ProjectSection + NewProject)
  getProjects = () => {
    let { user, currentProject, projects, setProjects } = this.context;
    api.getProjects('<token>', {}, { id: user.userId }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else if (res.data) {
        setProjects(res.data);
        if (res.data.length > 0 && !currentProject) {
          this.context.setCurrentProject(res.data[0]);

          // Check if current project is provisioning
          api.getInfra('<token>', {}, { project_id: res.data[0].id }, (err: any, res: any) => {
            if (err) {
              console.log(err);
            } else if (res.data) {

              let viewData = [] as any[]
              // TODO: separately handle non meta-provisioning case
              res.data.forEach((el: InfraType) => {
                if (el.status === 'creating') {
                  viewData.push({
                    infra_id: el.id,
                    kind: el.kind,
                  });
                }
              });
              
              if (viewData.length > 0) {
                this.setState({ currentView: 'provisioner', viewData, sidebarReady: true, });
              } else {
                this.setState({ sidebarReady: true });
              }
            }
          });
        } else if (res.data.length === 0) {
          this.setState({ currentView: 'new-project', sidebarReady: true, });
        }
      }
    });
  }

  componentDidMount() {
    let { user } = this.context;
    window.location.href.indexOf('127.0.0.1') === -1 && posthog.init(process.env.POSTHOG_API_KEY, {
      api_host: process.env.POSTHOG_HOST,
      loaded: function(posthog) { posthog.identify(user.email) }
    })

    this.getProjects();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props && this.context.currentProject) {

      // Set view to dashboard on project change
      if (this.state.prevProjectId && this.state.prevProjectId !== this.context.currentProject.id) {
        this.setState({
          prevProjectId: this.context.currentProject.id,
          currentView: 'dashboard'
        });
      }
    }
  }

  // TODO: move into ClusterDashboard
  renderDashboard = () => {
    let { currentCluster, setCurrentModal } = this.context;
    if (this.state.showWelcome || currentCluster && !currentCluster.name) {
      return (
        <DashboardWrapper>
          <Placeholder>
            <Bold>Porter - Getting Started</Bold><br /><br />
            1. Navigate to <A onClick={() => setCurrentModal('ClusterConfigModal')}>+ Add a Cluster</A> and provide a kubeconfig. *<br /><br />
            2. Choose which contexts you would like to use from the <A onClick={() => {
              setCurrentModal('ClusterConfigModal', { currentTab: 'select' });
            }}>Select Clusters</A> tab.<br /><br />
            3. For additional information, please refer to our <A>docs</A>.<br /><br /><br />

            * Make sure all fields are explicitly declared (e.g., certs and keys).
          </Placeholder>
        </DashboardWrapper>
      );
    } else if (!currentCluster) {
      return <Loading />
    }

    return (
      <DashboardWrapper>
        <ClusterDashboard
          currentCluster={currentCluster}
          setSidebar={(x: boolean) => this.setState({ forceSidebar: x })}
          setCurrentView={(x: string) => this.setState({ currentView: x })}
        />
      </DashboardWrapper>
    );
  }

  renderContents = () => {
    let { currentView } = this.state;
    if (currentView === 'cluster-dashboard') {
      return this.renderDashboard();
    } else if (currentView === 'dashboard') {
      return (
        <DashboardWrapper>
          <Dashboard setCurrentView={(x: string) => this.setState({ currentView: x })} />
        </DashboardWrapper>
      );
    } else if (currentView === 'integrations') {
      return <Integrations />;
    } else if (currentView === 'new-project') {
      return (
        <NewProject setCurrentView={(x: string, data: any ) => this.setState({ currentView: x, viewData: data })} />
      );
    } else if (currentView === 'provisioner') {
      return (
        <Provisioner 
          setCurrentView={(x: string) => this.setState({ currentView: x })}
          viewData={this.state.viewData}
        />
      );
    } else if (currentView === 'project-settings') {
      return (
        <ProjectSettings  setCurrentView={(x: string) => this.setState({ currentView: x })} />
      )
    }

    return (
      <Templates
        setCurrentView={(x: string) => this.setState({ currentView: x })}
      />
    );
  }

  setCurrentView = (x: string, viewData?: any) => {
    if (!viewData) {
      this.setState({ currentView: x });
    } else {
      this.setState({ currentView: x, viewData });
    }
  }

  renderSidebar = () => {
    if (this.context.projects.length > 0) {

      // Force sidebar closed on first provision
      if (this.state.currentView === 'provisioner' && this.state.forceSidebar) {
        this.setState({ forceSidebar: false });
      } else if (this.state.sidebarReady) {
        return (
          <Sidebar
            forceSidebar={this.state.forceSidebar}
            setWelcome={(x: boolean) => this.setState({ showWelcome: x })}
            setCurrentView={this.setCurrentView}
            currentView={this.state.currentView}
            forceRefreshClusters={this.state.forceRefreshClusters}
            setRefreshClusters={(x: boolean) => this.setState({ forceRefreshClusters: x })}
          />
        );
      }
    }
  }

  projectOverlayCall = () => {
    let { user, setProjects } = this.context;
    api.getProjects('<token>', {}, { id: user.userId }, (err: any, res: any) => {
      if (err) {
        console.log(err)
      } else if (res.data) {
        setProjects(res.data);
        if (res.data.length > 0) {
          this.context.setCurrentProject(res.data[0]);
        } else {
          this.context.currentModalData.setCurrentView('new-project');
        }
        this.context.setCurrentModal(null, null);
      }
    });
  }

  handleDelete = () => {
    let { setCurrentModal, currentProject } = this.context;
    api.deleteProject('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        // console.log(err)
      } else {
        this.projectOverlayCall();
      }
    });

    // Loop through and delete infra of all clusters we've provisioned
    api.getClusters('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        res.data.forEach((cluster: ClusterType) => {

          // Handle destroying infra we've provisioned
          if (cluster.infra_id) {
            console.log('destroying provisioned infra...', cluster.infra_id);
            api.destroyCluster('<token>', { eks_name: cluster.name }, { 
              project_id: currentProject.id,
              infra_id: cluster.infra_id,
            }, (err: any, res: any) => {
              if (err) {
                console.log(err)
              } else {
                console.log('destroyed provisioned infra:', cluster.infra_id);
              }
            });
          }
        });
      }
    });
    setCurrentModal(null, null)
    this.setState({ currentView: 'dashboard' });
  }

  render() {
    let { currentModal, setCurrentModal, currentProject } = this.context;
    return (
      <StyledHome>
        {currentModal === 'ClusterInstructionsModal' &&
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width='760px'
            height='650px'
          >
            <ClusterInstructionsModal />
          </Modal>
        }
        {currentModal === 'UpdateClusterModal' &&
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width='565px'
            height='275px'
          >
            <UpdateClusterModal 
              setRefreshClusters={(x: boolean) => this.setState({ forceRefreshClusters: x })} 
            />
          </Modal>
        }
        {currentModal === 'IntegrationsModal' &&
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width='760px'
            height='725px'
          >
            <IntegrationsModal />
          </Modal>
        }
        {currentModal === 'IntegrationsInstructionsModal' &&
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width='760px'
            height='650px'
          >
            <IntegrationsInstructionsModal />
          </Modal>
        }

        {this.renderSidebar()}

        <ViewWrapper>
          <Navbar
            logOut={this.props.logOut}
            currentView={this.state.currentView} // For form feedback
          />
          {this.renderContents()}
        </ViewWrapper>

        <ConfirmOverlay
          show={currentModal === 'UpdateProjectModal'}
          message={(currentProject) ? `Are you sure you want to delete ${currentProject.name}?` : ''}
          onYes={this.handleDelete}
          onNo={() => setCurrentModal(null, null)}
        />
      </StyledHome>
    );
  }
}

Home.contextType = Context;

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
  cursor: ${(props: { disabled?: boolean }) => props.disabled ? 'not-allowed' : 'pointer'};
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
      opacity: 0; transform: translateY(30px);
    }
    to {
      opacity: 1; transform: translateY(0px);
    }
  }
`;