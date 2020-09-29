import React, { Component } from 'react';
import styled from 'styled-components';
import gradient from '../../../assets/grad.jpg';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';

import ClusterSection from './ClusterSection';

type PropsType = {
  logOut: () => void
};

type StateType = {
  showSidebar: boolean,
  initializedSidebar: boolean,
  pressingCtrl: boolean,
  showTooltip: boolean,
  forceCloseDrawer: boolean
};

export default class Sidebar extends Component<PropsType, StateType> {

  // Need closeDrawer to hide drawer on sidebar close
  state = {
    showSidebar: true,
    initializedSidebar: false,
    pressingCtrl: false,
    showTooltip: false,
    forceCloseDrawer: false,
  };

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Meta' || e.key === 'Control') {
      this.setState({ pressingCtrl: true });
    } else if (e.keyCode === 220 && this.state.pressingCtrl) {
      this.toggleSidebar();
    }
  };

  handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'Meta' || e.key === 'Control') {
      this.setState({ pressingCtrl: false });
    }
  };

  toggleSidebar = (): void => {
    this.setState({ showSidebar: !this.state.showSidebar, forceCloseDrawer: true });
  };

  renderPullTab = (): JSX.Element | undefined => {
    if (!this.state.showSidebar) {
      return (
        <PullTab onClick={this.toggleSidebar}>
          <i className="material-icons">double_arrow</i>
        </PullTab>
      );
    }
  };

  renderTooltip = (): JSX.Element | undefined => {
    if (this.state.showTooltip) {
      return (
        <Tooltip>⌘/CTRL + \</Tooltip>
      );
    }
  };

  handleLogout = (): void => {
    let { logOut } = this.props;
    let { setCurrentError } = this.context;

    // Attempt user logout
    api.logOutUser('<token>', {}, {}, (err: any, res: any) => {
      // TODO: case and set logout error
      
      err ? setCurrentError(JSON.stringify(err)) : logOut();
    });
  }

  // SidebarBg is separate to cover retracted drawer
  render() {
    return (
      <div>
        {this.renderPullTab()}
        <StyledSidebar showSidebar={this.state.showSidebar}>
          <SidebarBg />
          <CollapseButton 
            onClick={this.toggleSidebar} 
            onMouseOver={() => { this.setState({ showTooltip: true }) }}
            onMouseOut={() => { this.setState({ showTooltip: false }) }}
          >
            {this.renderTooltip()}
            <i className="material-icons">double_arrow</i>
          </CollapseButton>

          <UserSection>
            <RingWrapper>
              <UserIcon src={gradient} />
            </RingWrapper>
            <UserName>bob_ross</UserName>
          </UserSection>

          <SidebarLabel>Current Cluster</SidebarLabel>
          <ClusterSection 
            forceCloseDrawer={this.state.forceCloseDrawer} 
            releaseDrawer={() => this.setState({ forceCloseDrawer: false })}
          />

          <LogOutButton onClick={this.handleLogout}>
            Log Out <i className="material-icons">keyboard_return</i>
          </LogOutButton>
        </StyledSidebar>
      </div>
    );
  }
}

Sidebar.contextType = Context;

const NavButton = styled.div`
  display: block;
  position: relative;
  text-decoration: none;
  height: 42px;
  margin: 3px 0px;
  padding: 10px 35px 12px 53px;
  font-size: 14px;
  font-family: 'Hind Siliguri', sans-serif;
  color: #ffffff;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  :hover {
    background: #ffffff0f;
  }

  > i {
    color: #ffffff;
    padding: 4px 4px;
    height: 20px;
    width: 20px;
    border-radius: 3px;
    font-size: 12px;
    position: absolute;
    left: 21px;
    top: 11px;
  }
`;

const LogOutButton = styled(NavButton)`
  position: absolute;
  width: calc(100% - 55px); 
  bottom: 12px;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  margin-left: -1px;
  color: #ffffffaa;

  > i {
    background: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffffaa;
    border: 1px solid #ffffffaa;
  }
`;

const SidebarBg = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background-color: #333748;
  height: 100%;
  z-index: -1;
`;

const SidebarLabel = styled.div`
  color: #ffffff99;
  padding: 5px 16px;
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: 500;
`;

const UserSection = styled.div`
  width: 100%;
  height: 40px;
  margin: 6px 0px 25px;
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
`;

const RingWrapper = styled.div`
  width: 28px;
  border-radius: 30px;
  :focus { outline: 0 }
  height: 28px;
  padding: 3px;
  border: 2px solid #ffffff44;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0px 10px 0px 18px;
`;

const UserIcon = styled.img`
  width: 20px;
  height: 20px;
  background: blue;
  border-radius: 50px;
  box-shadow: 0 2px 4px 0px #00000044;
`;

const UserName = styled.div`
  max-width: 120px;
  color: #e5e5e5;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
`;

const PullTab = styled.div`
  position: fixed;
  width: 30px;
  height: 50px;
  background: #7A838F77;
  top: calc(50vh - 60px);
  left: 0;
  z-index: 1;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  cursor: pointer;

  :hover {
    background: #99a5aF77;
  }

  > i {
    color: #ffffff77;
    font-size: 18px;
    position: absolute;
    top: 15px;
    left: 4px;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  right: -60px;
  top: 34px;
  width: 67px;
  height: 18px;
  padding-bottom: 2px;
  background: #383842dd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: white;
  font-size: 12px;
  font-family: "Assistant", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const CollapseButton = styled.div`
  position: absolute;
  right: 0;
  top: 8px;
  height: 23px;
  width: 23px;
  background: #525563;
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  cursor: pointer;

  :hover {
    background: #636674;
  }

  > i {
    color: #ffffff77;
    font-size: 14px;
    transform: rotate(180deg);
    position: absolute;
    top: 4px;
    right: 5px;
  }
`;

const StyledSidebar = styled.section`
  font-family: 'Work Sans', sans-serif;
  width: 200px;
  position: relative;
  padding-top: 20px;
  height: 100vh;
  z-index: 2;
  background-color: #333748;
  animation: ${(props: { showSidebar: boolean }) => (props.showSidebar ? 'showSidebar 0.4s' : 'hideSidebar 0.4s')};
  animation-fill-mode: forwards;
  @keyframes showSidebar {
    from { margin-left: -220px }
    to { margin-left: 0px }
  }
  @keyframes hideSidebar {
    from { margin-left: 0px }
    to { margin-left: -220px }
  }
`;