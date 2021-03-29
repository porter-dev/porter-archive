import React, { Component } from "react";
import styled from "styled-components";
import category from "assets/category.svg";
import integrations from "assets/integrations.svg";
import rocket from "assets/rocket.png";
import settings from "assets/settings.svg";
import discordLogo from "assets/discord.svg";

import { Context } from "shared/Context";

import ClusterSection from "./ClusterSection";
import ProjectSectionContainer from "./ProjectSectionContainer";
import loading from "assets/loading.gif";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  forceSidebar: boolean;
  setWelcome: (x: boolean) => void;
  currentView: string;
  forceRefreshClusters: boolean;
  setRefreshClusters: (x: boolean) => void;
};

type StateType = {
  showSidebar: boolean;
  initializedSidebar: boolean;
  pressingCtrl: boolean;
  showTooltip: boolean;
  forceCloseDrawer: boolean;
};

class Sidebar extends Component<PropsType, StateType> {
  // Need closeDrawer to hide drawer on sidebar close
  state = {
    showSidebar: true,
    initializedSidebar: false,
    pressingCtrl: false,
    showTooltip: false,
    forceCloseDrawer: false,
  };

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  }

  // Need to override showDrawer when the sidebar is closed
  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.forceSidebar !== this.props.forceSidebar) {
      this.setState({ showSidebar: this.props.forceSidebar });
    }
  }

  handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Meta" || e.key === "Control") {
      this.setState({ pressingCtrl: true });
    } else if (e.code === "Backslash" && this.state.pressingCtrl) {
      this.toggleSidebar();
    }
  };

  handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === "Meta" || e.key === "Control") {
      this.setState({ pressingCtrl: false });
    }
  };

  toggleSidebar = (): void => {
    this.setState({
      showSidebar: !this.state.showSidebar,
      forceCloseDrawer: true,
    });
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
      return <Tooltip>⌘/CTRL + \</Tooltip>;
    }
  };

  renderProjectContents = () => {
    let { currentView } = this.props;
    let { currentProject, setCurrentModal } = this.context;
    if (currentProject) {
      return (
        <>
          <SidebarLabel>Home</SidebarLabel>
          <NavButton
            onClick={() =>
              currentView !== "provisioner" &&
              this.props.history.push("/dashboard?tab=overview")
            }
            selected={
              currentView === "dashboard" || currentView === "provisioner"
            }
          >
            <Img src={category} />
            Dashboard
          </NavButton>
          <NavButton
            onClick={() => this.props.history.push("/launch")}
            selected={currentView === "launch"}
          >
            <Img src={rocket} />
            Launch
          </NavButton>
          <NavButton
            selected={currentView === "integrations"}
            onClick={() => {
              this.props.history.push("/integrations");
            }}
            // onClick={() => {
            //   setCurrentModal("IntegrationsInstructionsModal", {});
            // }}
          >
            <Img src={integrations} />
            Integrations
          </NavButton>
          {this.context.currentProject.roles.filter((obj: any) => {
            return obj.user_id === this.context.user.userId;
          })[0].kind === "admin" && (
            <NavButton
              onClick={() => this.props.history.push("/project-settings")}
              selected={this.props.currentView === "project-settings"}
            >
              <Img enlarge={true} src={settings} />
              Settings
            </NavButton>
          )}

          <br />

          <SidebarLabel>Current Cluster</SidebarLabel>
          <ClusterSection
            forceCloseDrawer={this.state.forceCloseDrawer}
            releaseDrawer={() => this.setState({ forceCloseDrawer: false })}
            setWelcome={this.props.setWelcome}
            currentView={currentView}
            isSelected={currentView === "cluster-dashboard"}
            forceRefreshClusters={this.props.forceRefreshClusters}
            setRefreshClusters={this.props.setRefreshClusters}
          />
        </>
      );
    }

    // Render placeholder if no project exists
    return <ProjectPlaceholder>No projects found.</ProjectPlaceholder>;
  };

  // SidebarBg is separate to cover retracted drawer
  render() {
    return (
      <>
        {this.renderPullTab()}
        <StyledSidebar showSidebar={this.state.showSidebar}>
          <SidebarBg />
          <CollapseButton
            onClick={this.toggleSidebar}
            onMouseOver={() => {
              this.setState({ showTooltip: true });
            }}
            onMouseOut={() => {
              this.setState({ showTooltip: false });
            }}
          >
            {this.renderTooltip()}
            <i className="material-icons">double_arrow</i>
          </CollapseButton>

          <ProjectSectionContainer />

          <br />

          {this.renderProjectContents()}

          <DiscordButton href="https://discord.gg/34n7NN7FJ7" target="_blank">
            <Icon src={discordLogo} />
            Join Our Discord
          </DiscordButton>
        </StyledSidebar>
      </>
    );
  }
}

Sidebar.contextType = Context;

export default withRouter(Sidebar);

const Icon = styled.img`
  height: 25px;
  width: 25px;
  opacity: 30%;
  margin-left: 7px;
  margin-right: 5px;
`;

const ProjectPlaceholder = styled.div`
  background: #ffffff11;
  border-radius: 5px;
  margin: 0 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100% - 100px);
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  color: #aaaabb;
  padding-bottom: 80px;

  > img {
    width: 17px;
    margin-right: 10px;
  }
`;

const NavButton = styled.div`
  display: block;
  position: relative;
  text-decoration: none;
  height: 42px;
  padding: 12px 35px 1px 53px;
  font-size: 14px;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: ${(props: { disabled?: boolean; selected?: boolean }) =>
    props.selected ? "#ffffff11" : ""};
  cursor: ${(props: { disabled?: boolean; selected?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  :hover {
    background: ${(props: { disabled?: boolean; selected?: boolean }) =>
      props.selected ? "" : "#ffffff08"};
  }

  > i {
    color: #ffffff;
    padding: 4px 4px;
    height: 20px;
    width: 20px;
    border-radius: 3px;
    font-size: 18px;
    position: absolute;
    left: 19px;
    top: 8px;
  }
`;

const Img = styled.img<{ enlarge?: boolean }>`
  padding: 4px 4px;
  height: ${(props) => (props.enlarge ? "27px" : "23px")};
  width: ${(props) => (props.enlarge ? "27px" : "23px")};
  border-radius: 3px;
  position: absolute;
  left: ${(props) => (props.enlarge ? "19px" : "20px")};
  top: 9px;
`;

const BottomSection = styled.div`
  position: absolute;
  width: 100%;
  bottom: 10px;
`;

const DiscordButton = styled.a`
  position: absolute;
  text-decoration: none;
  bottom: 17px;
  display: flex;
  align-items: center;
  width: calc(100% - 30px);
  left: 15px;
  border: 2px solid #ffffff44;
  border-radius: 3px;
  color: #ffffff44;
  height: 40px;
  font-family: Work Sans, sans-serif;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  :hover {
    > img {
      opacity: 60%;
    }
    color: #ffffff88;
    border-color: #ffffff88;
  }
`;

const LogOutButton = styled(NavButton)`
  width: calc(100% - 55px);
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  margin-left: -1px;
  color: #ffffffaa;

  > i {
    background: none;
    display: flex;
    font-size: 12px;
    top: 11px;
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
  background-color: #292c35;
  height: 100%;
  z-index: -1;
  box-shadow: 8px 0px 8px 0px #00000010;
`;

const SidebarLabel = styled.div`
  color: #ffffff99;
  padding: 5px 16px;
  margin-bottom: 5px;
  font-size: 14px;
  z-index: 1;
  font-weight: 500;
`;

const UserSection = styled.div`
  width: 100%;
  height: 40px;
  margin: 6px 0px 17px;
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
`;

const RingWrapper = styled.div`
  width: 28px;
  border-radius: 30px;
  :focus {
    outline: 0;
  }
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
  background: #7a838f77;
  top: calc(50vh - 60px);
  left: 0;
  z-index: 1;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  cursor: pointer;

  :hover {
    background: #99a5af77;
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
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const CollapseButton = styled.div`
  position: absolute;
  right: 0;
  top: 8px;
  height: 23px;
  width: 23px;
  background: #525563aa;
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
  font-family: "Work Sans", sans-serif;
  width: 200px;
  position: relative;
  padding-top: 20px;
  height: 100vh;
  z-index: 2;
  animation: ${(props: { showSidebar: boolean }) =>
    props.showSidebar ? "showSidebar 0.4s" : "hideSidebar 0.4s"};
  animation-fill-mode: forwards;
  @keyframes showSidebar {
    from {
      margin-left: -200px;
    }
    to {
      margin-left: 0px;
    }
  }
  @keyframes hideSidebar {
    from {
      margin-left: 0px;
    }
    to {
      margin-left: -200px;
    }
  }
`;
