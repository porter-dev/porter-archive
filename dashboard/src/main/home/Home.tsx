import React, { Component } from 'react';
import posthog from 'posthog-js';
import styled from 'styled-components';
import ReactModal from 'react-modal';

import { Context } from '../../shared/Context';
import api from '../../shared/api';
import { ClusterType, ProjectType } from '../../shared/types';
import { includesCompletedInfraSet } from '../../shared/common';

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
import ProvisionerStatus from './provisioner/ProvisionerStatus';
import ProjectSettings from './project-settings/ProjectSettings';
import ConfirmOverlay from '../../components/ConfirmOverlay';

type PropsType = {
  logOut: () => void,
  currentProject: ProjectType,
  currentCluster: ClusterType,
};

type StateType = {
  forceSidebar: boolean,
  showWelcome: boolean,
  currentView: string,
  handleDO: boolean, // Trigger DO infra calls after oauth flow if needed
  forceRefreshClusters: boolean, // For updating ClusterSection from modal on deletion

  // Track last project id for refreshing clusters on project change
  prevProjectId: number | null,
  sidebarReady: boolean, // Fixes error where ~1/3 times reloading to provisioner fails
};

// TODO: Handle cluster connected but with some failed infras (no successful set)
export default class Home extends Component<PropsType, StateType> {
  state = {
    forceSidebar: true,
    showWelcome: false,
    currentView: 'dashboard',
    prevProjectId: null as number | null,
    forceRefreshClusters: false,
    sidebarReady: false,
    handleDO: false,
  }

  // TODO: Refactor and prevent flash + multiple reload
  initializeView = () => {
    let { currentProject } = this.props;
    if (currentProject) {
      let { currentCluster } = this.context;
      
      // Check if current project is provisioning
      api.getInfra('<token>', {}, { project_id: currentProject.id }, (err: any, res: any) => {
        if (err) {
          console.log(err);
          return;
        }
        if (res.data.length > 0 && !(currentCluster || includesCompletedInfraSet(res.data))) {
          this.setState({ currentView: 'provisioner', sidebarReady: true, });
        } else {
          this.setState({ currentView: 'dashboard', sidebarReady: true });
        }
      });
    }
  }

  getProjects = (id?: number) => {
    let { user, setProjects } = this.context;
    let { currentProject } = this.props;
    api.getProjects('<token>', {}, { id: user.userId }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else if (res.data) {
        if (res.data.length === 0) {
          this.setState({ currentView: 'new-project', sidebarReady: true, });
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
            this.setState({ currentView: 'provisioner' });
          }

          if (!foundProject) {
            this.context.setCurrentProject(res.data[0]);
            this.initializeView();
          }
        }
      }
    });
  }

  provisionDOCR = (integrationId: number, tier: string, callback?: any) => {
    console.log('Provisioning DOCR...');
    api.createDOCR('<token>', {
      do_integration_id: integrationId,
      docr_name: this.props.currentProject.name,
      docr_subscription_tier: tier,
    }, { 
      project_id: this.props.currentProject.id
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        return;
      }
      callback && callback();
    });
  }

  provisionDOKS = (integrationId: number, region: string) => {
    console.log('Provisioning DOKS...');
    api.createDOKS('<token>', {
      do_integration_id: integrationId,
      doks_name: this.props.currentProject.name,
      do_region: region,
    }, { 
      project_id: this.props.currentProject.id
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        return;
      }
      this.setState({ currentView: 'provisioner' });
    });
  }

  checkDO = () => {
    let { currentProject } = this.props;
    if (this.state.handleDO && currentProject?.id) {
      api.getOAuthIds('<token>', {}, { 
        project_id: currentProject.id
      }, (err: any, res: any) => {
        if (err) {
          console.log(err);
          return;
        }
        let tgtIntegration = res.data.find((integration: any) => {
          return integration.client === 'do'
        });
        let queryString = window.location.search;
        let urlParams = new URLSearchParams(queryString);
        let tier = urlParams.get('tier');
        let region = urlParams.get('region');
        let infras = urlParams.getAll('infras');
        if (infras.length === 2) {
          this.provisionDOCR(tgtIntegration.id, tier, () => {
            this.provisionDOKS(tgtIntegration.id, region);
          });
        } else if (infras[0] === 'docr') {
          this.provisionDOCR(tgtIntegration.id, tier, () => {
            this.setState({ currentView: 'provisioner' });
          });
        } else {
          this.provisionDOKS(tgtIntegration.id, region);
        }
      });
      this.setState({ handleDO: false });
    }
  }

  componentDidMount() {

    // Handle redirect from DO
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);

    let err = urlParams.get('error');
    if (err) {
      this.context.setCurrentError(err);
    }

    let provision = urlParams.get('provision');
    let defaultProjectId = null;
    if (provision === 'do') {
      defaultProjectId = parseInt(urlParams.get('project_id'));
      this.setState({ handleDO: true });
      this.checkDO();
    }
    
    let { user } = this.context;
    window.location.href.indexOf('127.0.0.1') === -1 && posthog.init(process.env.POSTHOG_API_KEY, {
      api_host: process.env.POSTHOG_HOST,
      loaded: function(posthog: any) { posthog.identify(user.email) }
    })

    this.getProjects(defaultProjectId);
  }

  // TODO: Need to handle the following cases. Do a deep rearchitecture (Prov -> Dashboard?) if need be:
  // 1. Make sure clicking cluster in course drawer shows cluster-dashboard
  // 2. Make sure switching projects shows appropriate initial view (dashboard || provisioner)
  // 3. Make sure initializing from URL (DO oauth) displays the appropriate initial view
  componentDidUpdate(prevProps: PropsType) {
    if (
      prevProps.currentProject !== this.props.currentProject
      || (!prevProps.currentCluster && this.props.currentCluster)
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
    let { currentView, handleDO } = this.state;
    if (this.context.currentProject) {
      if (currentView === 'cluster-dashboard') {
        return this.renderDashboard();
      } else if (currentView === 'dashboard') {
        return (
          <DashboardWrapper>
            <Dashboard 
              setCurrentView={(x: string) => this.setState({ currentView: x })}
              projectId={this.context.currentProject?.id}
            />
          </DashboardWrapper>
        );
      } else if (currentView === 'integrations') {
        return <Integrations />;
      } else if (currentView === 'new-project') {
        return (
          <NewProject 
            setCurrentView={(x: string, data: any ) => this.setState({ currentView: x })} 
          />
        );
      } else if (currentView === 'provisioner') {
        return (
          <ProvisionerStatus
            setCurrentView={(x: string) => this.setState({ currentView: x })} 
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
    } else {

    }
  }

  setCurrentView = (x: string) => {
    if (x === 'dashboard') {
      this.initializeView();
    } else {
      this.setState({ currentView: x });
    }
  }

  renderSidebar = () => {
    if (this.context.projects.length > 0) {

      // Force sidebar closed on first provision
      if (this.state.currentView === 'provisioner' && this.state.forceSidebar) {
        this.setState({ forceSidebar: false });
      } else {
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
        <ReactModal
          isOpen={currentModal === 'ClusterInstructionsModal'}
          onRequestClose={() => setCurrentModal(null, null)}
          style={TallModalStyles}
          ariaHideApp={false}
        >
          <ClusterInstructionsModal />
        </ReactModal>
        <ReactModal
          isOpen={currentModal === 'UpdateClusterModal'}
          onRequestClose={() => setCurrentModal(null, null)}
          style={ProjectModalStyles}
          ariaHideApp={false}
        >
          <UpdateClusterModal 
            setRefreshClusters={(x: boolean) => this.setState({ forceRefreshClusters: x })} 
          />
        </ReactModal>
        <ReactModal
          isOpen={currentModal === 'IntegrationsModal'}
          onRequestClose={() => setCurrentModal(null, null)}
          style={SmallModalStyles}
          ariaHideApp={false}
        >
          <IntegrationsModal />
        </ReactModal>
        <ReactModal
          isOpen={currentModal === 'IntegrationsInstructionsModal'}
          onRequestClose={() => setCurrentModal(null, null)}
          style={TallModalStyles}
          ariaHideApp={false}
        >
          <IntegrationsInstructionsModal />
        </ReactModal>

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

const SmallModalStyles = {
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 2,
  },
  content: {
    borderRadius: '7px',
    border: 0,
    width: '760px',
    maxWidth: '80vw',
    margin: '0 auto',
    height: '425px',
    top: 'calc(50% - 214px)',
    backgroundColor: '#202227',
    animation: 'floatInModal 0.5s 0s',
    overflow: 'visible',
  },
};

const ProjectModalStyles = {
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 2,
  },
  content: {
    borderRadius: '7px',
    border: 0,
    width: '565px',
    maxWidth: '80vw',
    margin: '0 auto',
    height: '275px',
    top: 'calc(50% - 160px)',
    backgroundColor: '#202227',
    animation: 'floatInModal 0.5s 0s',
    overflow: 'visible',
  },
};

const TallModalStyles = {
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 2,
  },
  content: {
    borderRadius: '7px',
    border: 0,
    width: '760px',
    maxWidth: '80vw',
    margin: '0 auto',
    height: '650px',
    top: 'calc(50% - 325px)',
    backgroundColor: '#202227',
    animation: 'floatInModal 0.5s 0s',
    overflow: 'visible',
  },
};

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