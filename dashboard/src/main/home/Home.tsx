import React, { Component } from 'react';
import styled from 'styled-components';
import ReactModal from 'react-modal';

import { Context } from '../../shared/Context';
import api from '../../shared/api';
import { InfraType } from '../../shared/types';

import Sidebar from './sidebar/Sidebar';
import Dashboard from './dashboard/Dashboard';
import ClusterDashboard from './cluster-dashboard/ClusterDashboard';
import Loading from '../../components/Loading';
import Templates from './templates/Templates';
import Integrations from "./integrations/Integrations";
import UpdateProjectModal from './modals/UpdateProjectModal';
import ClusterInstructionsModal from './modals/ClusterInstructionsModal';
import IntegrationsModal from './modals/IntegrationsModal';
import IntegrationsInstructionsModal from './modals/IntegrationsInstructionsModal';
import NewProject from './new-project/NewProject';
import Navbar from './navbar/Navbar';
import Provisioner from './new-project/Provisioner';

type PropsType = {
  logOut: () => void
};

type StateType = {
  forceSidebar: boolean,
  showWelcome: boolean,
  currentView: string,
  viewData: any,

  // Track last project id for refreshing clusters on project change
  prevProjectId: number | null,
};

export default class Home extends Component<PropsType, StateType> {
  state = {
    forceSidebar: true,
    showWelcome: false,
    currentView: 'dashboard',
    prevProjectId: null as number | null,
    viewData: null as any
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
              
              // TODO: separately handle non meta-provisioning case
              res.data.forEach((el: InfraType) => {
                if (el.status === 'creating') {
                  this.setState({ currentView: 'provisioner', viewData: {
                    infra_id: el.id,
                    kind: el.kind,
                  }});
                }
              });
            }
          });
        } else if (res.data.length === 0) {
          this.setState({ currentView: 'new-project' });
        }
      }
    });
  }

  componentDidMount() {
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
      }
      
      return (
        <Sidebar
          forceSidebar={this.state.forceSidebar}
          setWelcome={(x: boolean) => this.setState({ showWelcome: x })}
          setCurrentView={this.setCurrentView}
          currentView={this.state.currentView}
        />
      );
    }
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
          isOpen={currentModal === 'UpdateProjectModal'}
          onRequestClose={() => setCurrentModal(null, null)}
          style={ProjectModalStyles}
          ariaHideApp={false}
        >
          <UpdateProjectModal />
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
    height: '225px',
    top: 'calc(50% - 120px)',
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