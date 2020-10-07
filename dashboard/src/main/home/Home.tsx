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
        <Dashboard />
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

const DummyDashboard = styled.div`
  height: 100%;
  width: 100vw;
  font-family: 'Work Sans', sans-serif;
  overflow-y: auto;
  display: flex;
  letter-spacing: 10px;
  flex: 1;
  justify-content: center;
  padding-bottom: 30px;
  align-items: center;
  background: ${props => props.theme.bg};
  position: relative;
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