import React, { Component } from "react";
import styled from "styled-components";
import category from "assets/category.svg";
import integrations from "assets/integrations.svg";
import rocket from "assets/rocket.png";
import monojob from "assets/monojob.png";
import monoweb from "assets/monoweb.png";
import settings from "assets/settings.svg";
import discordLogo from "assets/discord.svg";
import sliders from "assets/sliders.svg";

import { Context } from "shared/Context";

import ClusterSection from "./ClusterSection";
import ProjectSectionContainer from "./ProjectSectionContainer";
import loading from "assets/loading.gif";
import { RouteComponentProps, withRouter } from "react-router";
import { pushFiltered, pushQueryParams } from "shared/routing";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

type PropsType = RouteComponentProps &
  WithAuthProps & {
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

  renderClusterContent = () => {
    let { currentView } = this.props;
    let { currentCluster } = this.context;

    if (currentCluster) {
      return (
        <>
          <NavButton
            selected={currentView === "applications"}
            onClick={() => {
              let params = this.props.match.params as any;
              let pathNamespace = params.namespace;

              // If namespace is currently only in path (ex: ExpandedChart) set to param
              if (pathNamespace) {
                pushFiltered(
                  this.props,
                  "/applications",
                  ["project_id", "cluster", "namespace"],
                  {
                    cluster: currentCluster.name,
                    namespace: pathNamespace,
                  }
                );
              } else {
                pushFiltered(
                  this.props,
                  "/applications",
                  ["project_id", "cluster", "namespace"],
                  {
                    cluster: currentCluster.name,
                  }
                );
              }
            }}
          >
            <Img src={monoweb} />
            Applications
          </NavButton>
          <NavButton
            selected={currentView === "jobs"}
            onClick={() => {
              let params = this.props.match.params as any;
              let pathNamespace = params.namespace;

              // If namespace is currently only in path (ex: ExpandedChart) set to param
              if (pathNamespace) {
                pushFiltered(
                  this.props,
                  "/jobs",
                  ["project_id", "cluster", "namespace"],
                  {
                    cluster: currentCluster.name,
                    namespace: pathNamespace,
                  }
                );
              } else {
                pushFiltered(
                  this.props,
                  "/jobs",
                  ["project_id", "cluster", "namespace"],
                  {
                    cluster: currentCluster.name,
                  }
                );
              }
            }}
          >
            <Img src={monojob} />
            Jobs
          </NavButton>
          <NavButton
            selected={currentView === "env-groups"}
            onClick={() => {
              let params = this.props.match.params as any;
              let pathNamespace = params.namespace;

              // If namespace is currently only in path (ex: ExpandedChart) set to param
              if (pathNamespace) {
                pushFiltered(
                  this.props,
                  "/env-groups",
                  ["project_id", "cluster", "namespace"],
                  {
                    cluster: currentCluster.name,
                    namespace: pathNamespace,
                  }
                );
              } else {
                pushFiltered(
                  this.props,
                  "/env-groups",
                  ["project_id", "cluster", "namespace"],
                  {
                    cluster: currentCluster.name,
                  }
                );
              }
            }}
          >
            <Img src={sliders} />
            Env Groups
          </NavButton>
        </>
      );
    }
  };

  renderProjectContents = () => {
    let { currentView, history, location } = this.props;
    let { currentProject, setCurrentModal } = this.context;
    if (currentProject) {
      return (
        <>
          <SidebarLabel>Home</SidebarLabel>
          <NavButton
            onClick={() =>
              currentView !== "provisioner" &&
              pushFiltered(this.props, "/dashboard", ["project_id"])
            }
            selected={
              currentView === "dashboard" || currentView === "provisioner"
            }
          >
            <Img src={category} />
            Dashboard
          </NavButton>
          <NavButton
            onClick={() => pushFiltered(this.props, "/launch", ["project_id"])}
            selected={currentView === "launch"}
          >
            <Img src={rocket} />
            Launch
          </NavButton>

          {this.props.isAuthorized("integrations", "", ["get"]) && (
            <NavButton
              selected={currentView === "integrations"}
              onClick={() =>
                pushFiltered(this.props, "/integrations", ["project_id"])
              }
            >
              <Img src={integrations} />
              Integrations
            </NavButton>
          )}
          {this.props.isAuthorized("settings", "", [
            "get",
            "update",
            "delete",
          ]) && (
            <NavButton
              onClick={() =>
                pushFiltered(this.props, "/project-settings", ["project_id"])
              }
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
            isSelected={false}
            forceRefreshClusters={this.props.forceRefreshClusters}
            setRefreshClusters={this.props.setRefreshClusters}
          />
          {this.renderClusterContent()}
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

export default withRouter(withAuth(Sidebar));

const BranchPad = styled.div`
  width: 20px;
  height: 42px;
  margin-left: 2px;
  margin-right: 8px;
`;

const Rail = styled.div`
  width: 2px;
  background: ${(props: { lastTab?: boolean }) =>
    props.lastTab ? "" : "#52545D"};
  height: 50%;
`;

const Circle = styled.div`
  min-width: 10px;
  min-height: 2px;
  margin-bottom: -2px;
  margin-left: 8px;
  background: #52545d;
`;

const Gutter = styled.div`
  position: absolute;
  top: 0px;
  left: 22px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible;
`;

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
  display: flex;
  align-items: center;
  position: relative;
  text-decoration: none;
  height: 42px;
  padding: 0 30px 2px 20px;
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
  padding: ${(props) => (props.enlarge ? "0 0 0 1px" : "4px")};
  height: 23px;
  width: 23px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 10px;
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
