import React, { Component } from "react";
import styled from "styled-components";
import category from "assets/category.svg";
import integrations from "assets/integrations.svg";
import rocket from "assets/rocket.png";
import settings from "assets/settings.svg";

import { Context } from "shared/Context";

import Clusters from "./Clusters";
import ProjectSectionContainer from "./ProjectSectionContainer";
import { RouteComponentProps, withRouter } from "react-router";
import { getQueryParam, pushFiltered } from "shared/routing";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import SidebarLink from "./SidebarLink";

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
  showLinkTooltip: { [linkKey: string]: boolean };
};

class Sidebar extends Component<PropsType, StateType> {
  // Need closeDrawer to hide drawer on sidebar close
  state = {
    showSidebar: true,
    initializedSidebar: false,
    pressingCtrl: false,
    showTooltip: false,
    forceCloseDrawer: false,
    showLinkTooltip: {
      prev_envs: false,
    },
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
    let { currentProject } = this.context;
    if (currentProject) {
      return (
        <ScrollWrapper>
          <SidebarLabel>Home</SidebarLabel>
          <NavButton path={"/dashboard"}>
            <Img src={category} />
            Dashboard
          </NavButton>
          <NavButton path="/launch">
            <Img src={rocket} />
            Launch
          </NavButton>
          {currentProject && currentProject.managed_infra_enabled && (
            <NavButton path={"/infrastructure"}>
              <i className="material-icons">build_circle</i>
              Infrastructure
            </NavButton>
          )}
          {this.props.isAuthorized("integrations", "", [
            "get",
            "create",
            "update",
            "delete",
          ]) && (
            <NavButton path={"/integrations"}>
              <Img src={integrations} />
              Integrations
            </NavButton>
          )}
          {this.props.isAuthorized("settings", "", [
            "get",
            "update",
            "delete",
          ]) && (
            <NavButton path={"/project-settings"}>
              <Img enlarge={true} src={settings} />
              Project settings
            </NavButton>
          )}

          <br />

          {this.context.hasFinishedOnboarding && (
            <>
              <SidebarLabel>Clusters</SidebarLabel>
              <Clusters
                setWelcome={this.props.setWelcome}
                currentView={currentView}
                isSelected={false}
                forceRefreshClusters={this.props.forceRefreshClusters}
                setRefreshClusters={this.props.setRefreshClusters}
              />
            </>
          )}
        </ScrollWrapper>
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
        </StyledSidebar>
      </>
    );
  }
}

Sidebar.contextType = Context;

export default withRouter(withAuth(Sidebar));

const ScrollWrapper = styled.div`
  overflow-y: auto;
  padding-bottom: 25px;
  max-height: calc(100vh - 95px);
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

const NavButton = styled(SidebarLink)`
  display: flex;
  align-items: center;
  border-radius: 5px;
  position: relative;
  text-decoration: none;
  height: 34px;
  margin: 5px 15px;
  padding: 0 30px 2px 6px;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  &.active {
    background: #ffffff11;

    :hover {
      background: #ffffff11;
    }
  }

  :hover {
    background: #ffffff08;
  }

  > i {
    font-size: 20px;
    padding-top: 4px;
    border-radius: 3px;
    margin-right: 10px;
  }
`;

const Img = styled.img<{ enlarge?: boolean }>`
  padding: ${(props) => (props.enlarge ? "0 0 0 1px" : "4px")};
  height: 22px;
  width: 22px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 8px;
`;

const SidebarBg = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background-color: #202227;
  height: 100%;
  z-index: -1;
  border-right: 1px solid #383a3f;
`;

const SidebarLabel = styled.div`
  color: #ffffff99;
  padding: 5px 23px;
  margin-bottom: 5px;
  font-size: 13px;
  z-index: 1;
  font-weight: 500;
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
  min-width: 67px;
  height: 18px;
  padding-bottom: 2px;
  background: #383842dd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: white;
  font-size: 12px;
  font-family: Work Sans, sans-serif;
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
  width: 235px;
  position: relative;
  padding-top: 20px;
  height: 100vh;
  z-index: 2;
  animation: ${(props: { showSidebar: boolean }) =>
    props.showSidebar ? "showSidebar 0.4s" : "hideSidebar 0.4s"};
  animation-fill-mode: forwards;
  @keyframes showSidebar {
    from {
      margin-left: -235px;
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
      margin-left: -235px;
    }
  }
`;
