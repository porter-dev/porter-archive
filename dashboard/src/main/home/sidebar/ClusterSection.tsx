import React, { Component } from 'react';
import styled from 'styled-components';
import drawerBg from '../../../assets/drawer-bg.png';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { KubeContextConfig } from '../../../shared/types';

import Drawer from './Drawer';

type PropsType = {
  forceCloseDrawer: boolean,
  releaseDrawer: () => void
};

type StateType = {
  configExists: boolean,
  showDrawer: boolean,
  initializedDrawer: boolean,
  kubeContexts: KubeContextConfig[]
};

export default class ClusterSection extends Component<PropsType, StateType> {

  // Need to track initialized for animation mounting
  state = {
    configExists: true,
    showDrawer: false,
    initializedDrawer: false,
    kubeContexts: [] as KubeContextConfig[]
  };

  updateClusters = () => {
    let { setCurrentError, userId, setCurrentCluster } = this.context;

    // TODO: query with selected filter once implemented
    api.getContexts('<token>', {}, { id: userId }, (err: any, res: any) => {
      if (err) {
        setCurrentError('getContexts: ' + JSON.stringify(err));
      } else {
        
        // Filter selected (temporary)
        let kubeContexts = res.data.filter((x: KubeContextConfig) => x.selected);
        if (kubeContexts.length > 0) {
          this.setState({ kubeContexts });
          setCurrentCluster(kubeContexts[0].name);
        } else {
          this.setState({ kubeContexts: [] });
          setCurrentCluster(null);
        }
      }
    });
  }

  componentDidMount() {
    this.updateClusters();
  }

  // Need to override showDrawer when the sidebar is closed
  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props) {
      if (this.props.forceCloseDrawer && this.state.showDrawer) {
        this.setState({ showDrawer: false });
        this.props.releaseDrawer();
      }
    }
  }
  
  toggleDrawer = (): void => {
    if (!this.state.initializedDrawer) {
      this.setState({ initializedDrawer: true });
    }
    this.setState({ showDrawer: !this.state.showDrawer });
  };

  renderDrawer = (): JSX.Element | undefined => {
    if (this.state.initializedDrawer) {
      return (
        <Drawer
          updateClusters={this.updateClusters}
          toggleDrawer={this.toggleDrawer}
          showDrawer={this.state.showDrawer}
          kubeContexts={this.state.kubeContexts}
        />
      );
    }
  };

  showClusterConfigModal = () => {
    this.context.setCurrentModal('ClusterConfigModal');
    this.context.setCurrentModalData({ updateClusters: this.updateClusters });
  }

  renderContents = (): JSX.Element => {
    let { kubeContexts, showDrawer } = this.state;
    let { currentCluster } = this.context;

    if (kubeContexts.length > 0) {
      return (
        <ClusterSelector showDrawer={showDrawer}>
          <LinkWrapper>
            <ClusterIcon><i className="material-icons">polymer</i></ClusterIcon>
            <ClusterName>{currentCluster}</ClusterName>
          </LinkWrapper>
          <DrawerButton onClick={this.toggleDrawer}>
            <BgAccent src={drawerBg} />
            <DropdownIcon showDrawer={showDrawer}>
              <i className="material-icons">arrow_drop_down</i>
            </DropdownIcon>
          </DrawerButton>
        </ClusterSelector>
      )
    }

    return (
      <InitializeButton onClick={this.showClusterConfigModal}>
        <Plus>+</Plus> Add a Cluster
      </InitializeButton>
    )
  };

  render() {
    return (
      <div>
        {this.renderDrawer()}
        {this.renderContents()}
      </div>
    );
  }
}

ClusterSection.contextType = Context;

const Plus = styled.div`
  margin-right: 10px;
  font-size: 15px;
`;

const InitializeButton = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 30px);
  height: 38px;
  margin: 10px 15px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 3px;
  color: #ffffff;
  padding-bottom: 1px;
  cursor: pointer;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }
`;

const BgAccent = styled.img`
  height: 42px;
  background: #819BFD;
  width: 30px;
  border-top-left-radius: 100px;
  border-bottom-left-radius: 100px;
  position: absolute;
  top: 0;
  right: -8px;
  border: none;
  outline: none;
`;

const DrawerButton = styled.div`
  position: absolute;
  height: 42px;
  width: 22px;
  top: 0px;
  right: 0px;
  z-index: 0;
  overflow: hidden;
  border: none;
  outline: none;
`;

const ClusterName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  padding-right: 15px;
  text-overflow: ellipsis;
  display: inline-block;
  width: 130px;
  margin-left: 3px;
  font-weight: 600;
`;

const DropdownIcon = styled.span`
  position: absolute;
  right: ${(props: { showDrawer: boolean }) => (props.showDrawer ? '-2px' : '2px')};
  top: 10px;
  > i {
    font-size: 18px;
  }
  -webkit-transform: ${(props: { showDrawer: boolean }) => (props.showDrawer ? 'rotate(-90deg)' : 'rotate(90deg)')};
  transform: ${(props: { showDrawer: boolean }) => (props.showDrawer ? 'rotate(-90deg)' : 'rotate(90deg)')};
  animation: ${(props: { showDrawer: boolean }) => (props.showDrawer ? 'rotateLeft 0.5s' : 'rotateRight 0.5s')};
  animation-fill-mode: forwards;

  @keyframes rotateLeft {
    100% {
      right: 2px;
      -webkit-transform: rotate(90deg);
      transform: rotate(90deg);
    }
  }

  @keyframes rotateRight {
    100% {
      right: -2px;
      -webkit-transform: rotate(-90deg);
      transform: rotate(-90deg);
    }
  }

`;

const ClusterIcon = styled.div`
  > i {
    font-size: 16px;
    display: flex;
    align-items: center;
    margin-bottom: -2px;
    margin-left: 15px;
    margin-right: 10px;
  }
`;

const LinkWrapper = styled.div`
  color: white;
  height: 100%;
  display: flex;
  align-items: center;
  width: 100%;
`;

const ClusterSelector = styled.div`
  position: relative;
  display: block;
  padding-left: 7px;
  width: 100%;
  height: 42px;
  margin: 8px auto 10px auto;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  background: ${(props: { showDrawer: boolean }) => props.showDrawer ? '#ffffff0f' : ''};
  z-index: 1;

  :hover {
    background: #ffffff0f;
  }
`;