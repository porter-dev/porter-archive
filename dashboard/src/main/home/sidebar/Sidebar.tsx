import React, { Component } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { withAuth, type WithAuthProps } from "shared/auth/AuthorizationHoc";
import { Context } from "shared/Context";
import addOns from "assets/add-ons.svg";
import applications from "assets/applications.svg";
import category from "assets/category.svg";
import infra from "assets/cluster.svg";
import collapseSidebar from "assets/collapse-sidebar.svg";
import compliance from "assets/compliance.svg";
import database from "assets/database.svg";
import sliders from "assets/env-groups.svg";
import integrations from "assets/integrations.svg";
import lock from "assets/lock.svg";
import pr_icon from "assets/pull_request_icon.svg";
import rocket from "assets/rocket.png";
import settings from "assets/settings.svg";

import { envGroupPath } from "../../../shared/util";
import ClusterListContainer from "./ClusterListContainer";
import Clusters from "./Clusters";
import ProjectSectionContainer from "./ProjectSectionContainer";
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
  showLinkTooltip: Record<string, boolean>;
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
          <img src={collapseSidebar} />
        </PullTab>
      );
    }
  };

  renderTooltip = (): JSX.Element | undefined => {
    if (this.state.showTooltip) {
      return <Tooltip>⌘/CTRL + \</Tooltip>;
    }
  };

  renderProjectContents = (): React.ReactNode => {
    const { currentView } = this.props;
    const { currentProject, user, currentCluster, hasFinishedOnboarding } =
      this.context;
    if (!currentProject?.simplified_view_enabled) {
      return (
        <ScrollWrapper>
          <Spacer y={0.5} />
          <SidebarLabel>Home</SidebarLabel>
          <NavButton path={"/dashboard"}>
            <Img src={category} />
            Dashboard
          </NavButton>
          <NavButton path="/launch">
            <Img src={rocket} />
            Launch
          </NavButton>
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
              <Img src={settings} />
              Project settings
            </NavButton>
          )}

          <br />

          <SidebarLabel>
            {currentProject?.capi_provisioner_enabled
              ? "Your team"
              : "Clusters"}
          </SidebarLabel>
          <Clusters
            setWelcome={this.props.setWelcome}
            currentView={currentView}
            isSelected={false}
            forceRefreshClusters={this.props.forceRefreshClusters}
            setRefreshClusters={this.props.setRefreshClusters}
          />
        </ScrollWrapper>
      );
    } else if (currentProject.simplified_view_enabled) {
      if (currentProject.multi_cluster) {
        return (
          <ScrollWrapper>
            {this.props.isAuthorized("settings", "", [
              "get",
              "update",
              "delete",
            ]) && (
              <NavButton path={"/project-settings"}>
                <Img src={settings} />
                Project settings
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
            <NavButton
              path="/datastores"
              active={window.location.pathname.startsWith("/apps")}
            >
              <Container row spaced style={{ width: "100%" }}>
                <Container row>
                  <Img src={database} />
                  Datastores
                </Container>
                {(currentProject.sandbox_enabled ||
                  !currentProject.db_enabled) && <Image size={15} src={lock} />}
              </Container>
            </NavButton>
            {this.props.isAuthorized("settings", "", [
              "get",
              "update",
              "delete",
            ]) &&
              currentProject?.simplified_view_enabled &&
              currentProject?.capi_provisioner_enabled && (
                <NavButton
                  path={"/infrastructure"}
                  active={window.location.pathname.startsWith(
                    "/infrastructure"
                  )}
                >
                  <Img src={infra} />
                  Infrastructure
                </NavButton>
              )}
            {currentCluster && (
              <>
                <Spacer y={0.5} />
                <ClusterListContainer />
              </>
            )}
            <NavButton
              path="/apps"
              active={window.location.pathname.startsWith("/apps")}
            >
              <Img src={applications} />
              Applications
            </NavButton>
            <NavButton
              path="/addons"
              active={window.location.pathname.startsWith("/addons")}
            >
              <Img src={addOns} />
              Add-ons
            </NavButton>
            <NavButton
              path={envGroupPath(currentProject, "")}
              active={window.location.pathname.startsWith(
                envGroupPath(currentProject, "")
              )}
            >
              <Img src={sliders} />
              Env groups
            </NavButton>
            {this.props.isAuthorized("settings", "", [
              "get",
              "update",
              "delete",
            ]) &&
              !(
                currentProject?.simplified_view_enabled &&
                currentProject?.capi_provisioner_enabled
              ) && (
                <NavButton
                  path={"/cluster-dashboard"}
                  active={window.location.pathname.startsWith(
                    "/cluster-dashboard"
                  )}
                >
                  <Img src={infra} />
                  Infrastructure
                </NavButton>
              )}
            <NavButton path="/preview-environments">
              <Container row spaced style={{ width: "100%" }}>
                <Container row>
                  <Img src={pr_icon} />
                  Preview apps
                </Container>
                {(currentProject.sandbox_enabled ||
                  !currentProject.preview_envs_enabled) && (
                  <Image size={15} src={lock} />
                )}
              </Container>
            </NavButton>
            {/* Hacky workaround for setting currentCluster with legacy method */}
            <Clusters
              setWelcome={this.props.setWelcome}
              currentView={currentView}
              isSelected={false}
              forceRefreshClusters={this.props.forceRefreshClusters}
              setRefreshClusters={this.props.setRefreshClusters}
            />
          </ScrollWrapper>
        );
      } else {
        return (
          <ScrollWrapper>
            <Spacer y={0.4} />
            <NavButton
              path="/apps"
              active={window.location.pathname.startsWith("/apps")}
            >
              <Img src={applications} />
              Applications
            </NavButton>
            <NavButton
              path="/datastores"
              active={window.location.pathname.startsWith("/apps")}
            >
              <Container row spaced style={{ width: "100%" }}>
                <Container row>
                  <Img src={database} />
                  Datastores
                </Container>
              </Container>
            </NavButton>
            {!currentProject.sandbox_enabled && (
              <NavButton
                path="/addons"
                active={window.location.pathname.startsWith("/addons")}
              >
                <Container row spaced style={{ width: "100%" }}>
                  <Container row>
                    <Img src={addOns} />
                    Add-ons
                  </Container>
                </Container>
              </NavButton>
            )}

            {!currentProject.sandbox_enabled && (
              <NavButton
                path={envGroupPath(currentProject, "")}
                active={window.location.pathname.startsWith(
                  envGroupPath(currentProject, "")
                )}
              >
                <Container row spaced style={{ width: "100%" }}>
                  <Container row>
                    <Img src={sliders} />
                    Env groups
                  </Container>
                </Container>
              </NavButton>
            )}

            {!currentProject.sandbox_enabled && (
              <NavButton
                path={
                  currentProject?.simplified_view_enabled &&
                  currentProject?.capi_provisioner_enabled
                    ? "/infrastructure"
                    : "/cluster-dashboard"
                }
                active={window.location.pathname.startsWith(
                  currentProject?.simplified_view_enabled &&
                    currentProject?.capi_provisioner_enabled
                    ? "/infrastructure"
                    : "/cluster-dashboard"
                )}
              >
                <Container row spaced style={{ width: "100%" }}>
                  <Container row>
                    <Img src={infra} />
                    Infrastructure
                  </Container>
                </Container>
              </NavButton>
            )}

            <NavButton path="/preview-environments">
              <Container row spaced style={{ width: "100%" }}>
                <Container row>
                  <Img src={pr_icon} />
                  Preview apps
                </Container>
                {!currentProject.preview_envs_enabled && <Badge>Beta</Badge>}
              </Container>
            </NavButton>

            <NavButton path="/compliance">
              <Container row spaced style={{ width: "100%" }}>
                <Container row>
                  <Img src={compliance} />
                  Compliance
                </Container>
                {(currentProject.sandbox_enabled ||
                  !currentProject.soc2_controls_enabled) && (
                  <Image size={15} src={lock} />
                )}
              </Container>
            </NavButton>

            {!currentProject.sandbox_enabled &&
              this.props.isAuthorized("integrations", "", [
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
                <Img src={settings} />
                Project settings
              </NavButton>
            )}

            {/* Hacky workaround for setting currentCluster with legacy method */}
            <Clusters
              setWelcome={this.props.setWelcome}
              currentView={currentView}
              isSelected={false}
              forceRefreshClusters={this.props.forceRefreshClusters}
              setRefreshClusters={this.props.setRefreshClusters}
            />
          </ScrollWrapper>
        );
      }
    }

    // Render placeholder if no project exists
    return <ProjectPlaceholder>No projects found.</ProjectPlaceholder>;
  };

  // SidebarBg is separate to cover retracted drawer
  render(): React.ReactNode {
    return (
      <>
        {this.renderPullTab()}
        <StyledSidebar showSidebar={this.state.showSidebar}>
          <SidebarBg />
          <Spacer y={0.5} />
          <ProjectSectionContainer collapseSidebar={this.toggleSidebar} />
          {this.renderProjectContents()}
          {this.context.featurePreview && (
            <Container row>
              <Spacer inline width="25px" />
              <Text color="helper">(Feature preview enabled)</Text>
            </Container>
          )}
        </StyledSidebar>
      </>
    );
  }
}

Sidebar.contextType = Context;

export default withRouter(withAuth(Sidebar));

const Badge = styled.div`
  background: linear-gradient(60deg, #4b366d 0%, #6475b9 100%);
  color: white;
  border-radius: 3px;
  padding: 2px 5px;
  margin-right: -5px;
  font-size: 13px;
`;

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
  height: 45px;
  margin: 7px 22px;
  padding: 0 30px 2px 7px;
  font-size: 13px;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  &.active {
    background: #202126;

    :hover {
      background: #202126;
    }
  }

  :hover {
    background: #ffffff09;
  }

  > i {
    font-size: 18px;
    border-radius: 3px;
    margin-left: 2px;
    margin-right: 10px;
  }
`;

const Img = styled.img<{ enlarge?: boolean }>`
  padding: ${(props) => (props.enlarge ? "0 0 0 1px" : "4px")};
  height: 25px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 8px;
  opacity: 0.8;
`;

const SidebarBg = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background-color: ${(props) => props.theme.bg};
  height: 100%;
  z-index: -1;
  border-right: 1px solid #383a3f;
`;

const SidebarLabel = styled.div`
  color: ${(props) => props.theme.text.primary};
  padding: 5px 23px;
  margin-bottom: 5px;
  font-size: 13px;
  z-index: 1;
`;

const PullTab = styled.div`
  position: fixed;
  width: 30px;
  height: 30px;
  border: 1px solid #383a3f;
  border-left: none;
  top: calc(50vh - 60px);
  left: 0;
  z-index: 1;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  > img {
    height: 14px;
    width: 14px;
    opacity: 0.5;
  }

  :hover {
    border: 1px solid ${(props) => props.theme.text.primary};
    border-left: none;
    > img {
      opacity: 0.9;
    }
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

const StyledSidebar = styled.section`
  width: 260px;
  position: relative;
  padding-top: 20px;
  height: 100vh;
  z-index: 2;
  animation: ${(props: { showSidebar: boolean }) =>
    props.showSidebar ? "showSidebar 0.4s" : "hideSidebar 0.4s"};
  animation-fill-mode: forwards;
  @keyframes showSidebar {
    from {
      margin-left: -260px;
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
      margin-left: -260px;
    }
  }
`;
