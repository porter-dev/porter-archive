import React, { Component } from 'react';
import styled from 'styled-components';
import ReactModal from 'react-modal';

import { Context } from '../../shared/Context';
import api from '../../shared/api';

import Sidebar from './sidebar/Sidebar';
import Dashboard from './dashboard/Dashboard';
import ClusterDashboard from './cluster-dashboard/ClusterDashboard';
import Loading from '../../components/Loading';
import Templates from './templates/Templates';
import LaunchTemplateModal from './modals/LaunchTemplateModal';
import CreateProjectModal from './modals/CreateProjectModal';
import UpdateProjectModal from './modals/UpdateProjectModal';
import ClusterInstructionsModal from './modals/ClusterInstructionsModal';

type PropsType = {
  logOut: () => void
};

type StateType = {
  forceSidebar: boolean,
  showWelcome: boolean,
  currentView: string,

  // Track last project id for refreshing clusters on project change
  prevProjectId: number | null
};

export default class Home extends Component<PropsType, StateType> {
  state = {
    forceSidebar: true,
    showWelcome: false,
    currentView: 'cluster-dashboard',
    prevProjectId: null as number | null
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props && this.context.currentProject) {

      // Set view to dashboard on project change
      if (this.state.prevProjectId !== this.context.currentProject.id) {
        this.setState({ currentView: 'dashboard' });
      }
    }
  }

  // TODO: move into ClusterDashboard
  renderDashboard = () => {
    let { currentCluster, setCurrentModal } = this.context;

    if (currentCluster === {} || this.state.showWelcome || currentCluster && !currentCluster.name) {
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
        />
      </DashboardWrapper>
    );
  }

  renderContents = () => {
    if (this.state.currentView === 'cluster-dashboard') {
      return (
        <StyledDashboard>
          {this.renderDashboard()}
        </StyledDashboard>
      );
    } else if (this.state.currentView === 'dashboard') {
      return (
        <StyledDashboard>
          <DashboardWrapper>
            <Dashboard />
          </DashboardWrapper>
        </StyledDashboard>
      );
    }

    return <Templates />;
  }

  render() {
    let { currentModal, setCurrentModal, currentProject } = this.context;
    return (
      <StyledHome>
        <ReactModal
          isOpen={currentModal === 'LaunchTemplateModal'}
          onRequestClose={() => setCurrentModal(null, null)}
          style={MediumModalStyles}
          ariaHideApp={false}
        >
          <LaunchTemplateModal />
        </ReactModal>
        <ReactModal
          isOpen={currentModal === 'CreateProjectModal'}
          onRequestClose={() => currentProject ? setCurrentModal(null, null) : null }
          style={ProjectModalStyles}
          ariaHideApp={false}
        >
          <CreateProjectModal />
        </ReactModal>
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

        <Sidebar
          logOut={this.props.logOut}
          forceSidebar={this.state.forceSidebar}
          setWelcome={(x: boolean) => this.setState({ showWelcome: x })}
          setCurrentView={(x: string) => this.setState({ currentView: x })}
          currentView={this.state.currentView}
        />
        
        {this.renderContents()}
      </StyledHome>
    );
  }
}

Home.contextType = Context;

const MediumModalStyles = {
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
    height: '575px',
    top: 'calc(50% - 289px)',
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

const StyledDashboard = styled.div`
  height: 100%;
  width: 100vw;
  padding-top: 80px;
  overflow-y: auto;
  display: flex;
  flex: 1;
  justify-content: center;
  background: #202227;
  position: relative;
`;

const DashboardWrapper = styled.div`
  width: 80%;
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