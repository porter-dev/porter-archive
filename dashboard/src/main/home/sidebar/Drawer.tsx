import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../assets/close.png';

type PropsType = {
  showDrawer: boolean,
  toggleDrawer: () => void
};

type ClusterOption = {
  name: string
}

const dummyClusters: ClusterOption[]  = [
  { name: 'happy-lil-trees' },
  { name: 'joyous-petite-rocks' },
  { name: 'friendly-small-bush' }
];

export default class Drawer extends Component<PropsType> {

  renderClusterList = () => {
    return dummyClusters.map((cluster, i) => {
      /*
      let active = this.context.activeProject &&
        this.context.activeProject.namespace == val.namespace; 
      */

      return (
        <ClusterOption key={i}>
          <ClusterIcon><i className="material-icons">polymer</i></ClusterIcon>
          <ClusterName>{cluster.name}</ClusterName>
        </ClusterOption>
      );
    });
  }

  renderCloseOverlay = () => {
    if (this.props.showDrawer) {
      return (
        <CloseOverlay onClick={this.props.toggleDrawer} />
      );
    }
  }

  render() {
    return (
      <div>
        {this.renderCloseOverlay()}
        <StyledDrawer showDrawer={this.props.showDrawer}>
          <CloseButton onClick={this.props.toggleDrawer}>
            <CloseButtonImg src={close} />
          </CloseButton>

          {this.renderClusterList()}
        </StyledDrawer>
      </div>
    );
  }
}

const ClusterOption = styled.div`
  width: 100%;
  padding: 2px 7px;
  padding-right: 30px;
  display: flex;
  align-items: center;
  height: 50px;
  text-decoration: none;
  color: white;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  :hover {
    background: #ffffff18;
  }
`;

const CloseOverlay = styled.div`
  background: transparent;
  width: 100vw;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  z-index: -2;
`;

const CloseButton = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  right: 10px;
  top: 7px;
  cursor: pointer;
  :hover {
    background-color: #ffffff20;
  }
`;

const CloseButtonImg = styled.img`
  width: 12px;
  margin: 0 auto;
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

const StyledDrawer = styled.div`
  position: absolute;
  height: 100%;
  padding-top: 36px;
  width: 230px;
  overflow-y: auto;
  padding-bottom: 40px;
  top: 0;
  left: ${(props: { showDrawer: boolean }) => (props.showDrawer ? '-30px' : '200px')};
  z-index: -2;
  background: #00000fd4;
  animation: ${(props: { showDrawer: boolean }) => (props.showDrawer ? 'slideDrawerRight 0.4s' : 'slideDrawerLeft 0.4s')};
  animation-fill-mode: forwards;
  @keyframes slideDrawerRight {
    from { left: -30px }
    to { left: 200px }
  }
  @keyframes slideDrawerLeft {
    from { left: 200px }
    to { left: -30px }
  }
`;

const ClusterName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 3px;
`;
