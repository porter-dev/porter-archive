import React, { Component } from 'react';
import styled from 'styled-components';
import ReactModal from 'react-modal';

import { Context } from '../../shared/Context';

import Sidebar from './sidebar/Sidebar';
import Dashboard from './dashboard/Dashboard';
import ClusterConfigModal from './modals/ClusterConfigModal';

type PropsType = {
  logOut: () => void
};

type StateType = {
};

export default class Home extends Component<PropsType, StateType> {

  renderDashboard = () => {
    if (this.context.currentCluster) {
      return <Dashboard />
    }

    return (
        <Placeholder>
          <Bold>Porter 101</Bold><br />
          1. Go to <A onClick={() => {this.context.setCurrentModal('ClusterConfigModal')}}>+ Add a Cluster</A> to connect to your Kubernetes cluster(s).<br /><br />
          2. Check out the <A onClick={() => {this.context.setCurrentModal('CreateService')}}>Integrations</A> tab to link your repo, image registry, Slack workspace, and more.<br /><br />
          4. Sync local changes to Porter for easy <A target='_blank' href='https://docs.getporter.dev/docs/cli-documentation#porter-sync'>remote development</A>.
        </Placeholder>
    );
  }

  render() {
    return (
      <StyledHome>
        <ReactModal
          isOpen={this.context.currentModal === 'ClusterConfigModal'}
          onRequestClose={() => this.context.setCurrentModal(null)}
          style={MediumModalStyles}
          ariaHideApp={false}
        >
          <ClusterConfigModal />
        </ReactModal>

        <Sidebar logOut={this.props.logOut} />
        <StyledDashboard>
          <DashboardWrapper>
            {this.renderDashboard()}
          </DashboardWrapper>
        </StyledDashboard>
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
    backgroundColor: '#24272a',
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
  background: #24272a;
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
  cursor: pointer;
`;

const Placeholder = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #6f6f6f;
  font-size: 16px;
  margin-left: 25px;
  margin-top: 7vh;
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