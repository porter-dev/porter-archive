import React, { Component } from "react";
import styled from "styled-components";
import category from "assets/category.svg";
import integrations from "assets/integrations.svg";
import rocket from "assets/rocket.png";
import monojob from "assets/monojob.png";
import monoweb from "assets/monoweb.png";
import settings from "assets/settings.svg";
import sliders from "assets/sliders.svg";
import PullRequestIcon from "assets/pull_request_icon.svg";

import { Context } from "shared/Context";

import ClusterSection from "./ClusterSection";
import ProjectSectionContainer from "./ProjectSectionContainer";
import { RouteComponentProps, withRouter } from "react-router";
import { getQueryParam, pushFiltered } from "shared/routing";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import { NavLink } from "react-router-dom";

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

  /**
   * Helper function that will keep the query params before redirect the user to a new page
   *
   * @param location
   * @param path Path to redirect to
   * @returns React router `to` object
   */
  withQueryParams = (location: any, path: string) => {
    let { currentCluster, currentProject } = this.context;
    let params = this.props.match.params as any;
    let pathNamespace = params.namespace;
    let search = `?cluster=${currentCluster.name}&project_id=${currentProject.id}`;

    if (!pathNamespace) {
      pathNamespace = getQueryParam(this.props, "namespace");
    }

    if (pathNamespace) {
      search = search.concat(`&namespace=${pathNamespace}`);
    }

    return {
      ...location,
      pathname: path,
      search,
    };
  };

  renderClusterContent = () => {
    let { currentCluster, currentProject } = this.context;

    if (currentCluster) {
      return (
        <>
          <NavButton
            to={(location) => this.withQueryParams(location, "/applications")}
          >
            <Img src={monoweb} />
            Applications
          </NavButton>
          <NavButton to={() => this.withQueryParams(location, "/jobs")}>
            <Img src={monojob} />
            Jobs
          </NavButton>
          <NavButton to={() => this.withQueryParams(location, "/env-groups")}>
            <Img src={sliders} />
            Env Groups
          </NavButton>
          {currentCluster.service === "eks" &&
            currentCluster.infra_id > 0 &&
            currentProject.enable_rds_databases && (
              <NavButton to={"/databases"}>
                <Icon className="material-icons-outlined">storage</Icon>
                Databases
              </NavButton>
            )}
          {currentProject?.preview_envs_enabled && (
            <NavButton to="/preview-environments">
              <InlineSVGWrapper
                id="Flat"
                fill="#FFFFFF"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 256"
              >
                <path d="M103.99951,68a36,36,0,1,0-44,35.0929v49.8142a36,36,0,1,0,16,0V103.0929A36.05516,36.05516,0,0,0,103.99951,68Zm-56,0a20,20,0,1,1,20,20A20.0226,20.0226,0,0,1,47.99951,68Zm40,120a20,20,0,1,1-20-20A20.0226,20.0226,0,0,1,87.99951,188ZM196.002,152.907l-.00146-33.02563a55.63508,55.63508,0,0,0-16.40137-39.59619L155.31348,56h20.686a8,8,0,0,0,0-16h-40c-.02978,0-.05859.00415-.08838.00446-.2334.00256-.46631.01245-.69824.03527-.12891.01258-.25391.03632-.38086.05494-.13135.01928-.26318.03424-.39355.06-.14014.02778-.27686.06611-.41455.10114-.11475.02924-.23047.05426-.34424.08862-.13428.04059-.26367.0907-.395.13806-.11524.04151-.231.07929-.34473.12629-.12109.05011-.23681.10876-.35449.16455-.11914.05621-.23926.10907-.356.17144-.11133.0597-.21728.12757-.32519.1922-.11621.06928-.23389.13483-.34668.21051-.11719.07831-.227.16553-.33985.24976-.09668.07227-.1958.1394-.28955.21655-.18652.1529-.36426.31531-.53564.48413-.01612.01593-.03418.02918-.05029.04529-.02051.02051-.0376.04321-.05762.06391-.16358.16711-.32178.33941-.47022.52032-.083.10059-.15527.20648-.23193.31006-.07861.10571-.16064.20862-.23438.3183-.08056.12072-.15087.24591-.2246.36993-.05958.1-.12208.19757-.17725.30036-.06787.12591-.125.25531-.18506.384-.05078.1084-.10547.21466-.15137.32568-.05127.12463-.09326.25189-.13867.37848-.04248.11987-.08887.238-.126.36047-.03857.12775-.06738.25757-.09912.38678-.03125.124-.06591.24622-.0913.37244-.02979.15088-.04786.30328-.06934.45544-.01465.10645-.03516.21094-.0459.31867q-.03955.39752-.04.79706V88a8,8,0,0,0,16,0V67.31378l24.28516,24.28485a39.73874,39.73874,0,0,1,11.71582,28.28321l.00146,33.02533a36.00007,36.00007,0,1,0,16-.00019ZM188.00244,208a20,20,0,1,1,20-20A20.0226,20.0226,0,0,1,188.00244,208Z" />
              </InlineSVGWrapper>
              <EllipsisTextWrapper
                onMouseOver={() => {
                  this.setState((prev) => ({
                    ...prev,
                    showLinkTooltip: {
                      ...prev.showLinkTooltip,
                      prev_envs: true,
                    },
                  }));
                }}
                onMouseOut={() => {
                  this.setState((prev) => ({
                    ...prev,
                    showLinkTooltip: {
                      ...prev.showLinkTooltip,
                      prev_envs: false,
                    },
                  }));
                }}
              >
                Preview Envs
              </EllipsisTextWrapper>
            </NavButton>
          )}
          {currentProject?.stacks_enabled ? (
            <NavButton
              to={(location) => this.withQueryParams(location, "/stacks")}
            >
              <Icon className="material-icons-outlined">lan</Icon>
              Stacks
            </NavButton>
          ) : null}
        </>
      );
    }
  };

  renderProjectContents = () => {
    let { currentView } = this.props;
    let { currentProject } = this.context;
    if (currentProject) {
      return (
        <>
          <SidebarLabel>Home</SidebarLabel>
          <NavButton to="/dashboard">
            <Img src={category} />
            Dashboard
          </NavButton>
          <NavButton to="/launch">
            <Img src={rocket} />
            Launch
          </NavButton>
          {currentProject && currentProject.managed_infra_enabled && (
            <NavButton to={"/infrastructure"}>
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
            <NavButton to="/integrations">
              <Img src={integrations} />
              Integrations
            </NavButton>
          )}
          {this.props.isAuthorized("settings", "", [
            "get",
            "update",
            "delete",
          ]) && (
            <NavButton to="/project-settings">
              <Img enlarge={true} src={settings} />
              Settings
            </NavButton>
          )}

          <br />

          {this.context.hasFinishedOnboarding && (
            <>
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
          )}
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
        </StyledSidebar>
      </>
    );
  }
}

Sidebar.contextType = Context;

export default withRouter(withAuth(Sidebar));

const Icon = styled.span`
  padding: 4px;
  width: 23px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 10px;
  font-size: 18px;
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

const NavButton = styled(NavLink)`
  display: flex;
  align-items: center;
  position: relative;
  text-decoration: none;
  height: 42px;
  padding: 0 30px 2px 20px;
  font-size: 14px;
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
  height: 23px;
  width: 23px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 10px;
`;

const InlineSVGWrapper = styled.svg`
  width: 32px;
  height: 32px;
  padding: 8px;
  padding-left: 0;

  > path {
    fill: #ffffff;
  }
`;

const EllipsisTextWrapper = styled.span`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
