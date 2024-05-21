import React, { Component } from "react";
import styled from "styled-components";

import api from "shared/api";
import { pushFiltered } from "shared/routing";
import { Context } from "shared/Context";
import { ClusterType } from "shared/types";
import { ClusterSection } from "./ClusterSection";
import SidebarLink from "./SidebarLink";

import settings from "assets/settings.svg";
import job from "assets/job-bold.png";
import web from "assets/web-bold.png";
import sliders from "assets/sliders.svg";

import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  setWelcome: (x: boolean) => void;
  currentView: string;
  isSelected: boolean;
  forceRefreshClusters: boolean;
  display?: string;
  setRefreshClusters: (x: boolean) => void;
};

type StateType = {
  clusters: ClusterType[];

  // Track last project id for refreshing clusters on project change
  prevProjectId: number;
};

class Clusters extends Component<PropsType, StateType> {
  // Need to track initialized for animation mounting
  state = {
    clusters: [] as ClusterType[],
    prevProjectId: this.context.currentProject?.id,
  };

  updateClusters = () => {
    if (!this.context.currentProject) {
      return;
    }
    let {
      user,
      currentProject,
      setCurrentCluster,
      currentCluster,
    } = this.context;

    // TODO: query with selected filter once implemented
    api
      .getClusters("<token>", {}, { id: currentProject?.id })
      .then((res) => {
        window.analytics?.identify(user.userId, {
          currentProject,
          clusters: res.data,
        });

        this.props.setWelcome(false);
        // TODO: handle uninitialized kubeconfig
        if (res.data) {
          let clusters = res.data;
          clusters.sort((a: any, b: any) => a.id - b.id);
          if (clusters.length > 0) {
            let queryString = window.location.search;
            let urlParams = new URLSearchParams(queryString);
            let paramClusterName = urlParams.get("cluster");
            let params = this.props.match.params as any;
            let pathClusterName = params.cluster;

            // Set cluster from URL if in path or params
            let defaultCluster = null as ClusterType;
            if (paramClusterName || pathClusterName) {
              clusters.forEach((cluster: ClusterType) => {
                if (!defaultCluster) {
                  if (cluster.name === pathClusterName) {
                    defaultCluster = cluster;
                  } else if (cluster.name === paramClusterName) {
                    defaultCluster = cluster;
                  }
                }
              });
            }

            this.setState({ clusters });
            let saved = JSON.parse(
              localStorage.getItem(currentProject?.id + "-cluster")
            );
            if (!defaultCluster && saved && saved !== "null") {
              // Ensures currentCluster isn't prematurely set (causes issues downstream)
              let loaded = false;
              for (let i = 0; i < clusters.length; i++) {
                if (
                  clusters[i].id === saved.id &&
                  clusters[i].project_id === saved.project_id &&
                  clusters[i].name === saved.name
                ) {
                  loaded = true;
                  setCurrentCluster(clusters[i]);
                  break;
                }
              }
              if (!loaded) {
                setCurrentCluster(clusters[0]);
              }
            } else {
              setCurrentCluster(defaultCluster || clusters[0]);
            }
          } else if (
            this.props.currentView !== "provisioner" &&
            this.props.currentView !== "new-project"
          ) {
            this.setState({ clusters: [] });
            setCurrentCluster(null);
          }
        }
      })
      .catch((err) => this.props.setWelcome(true));
  };

  componentDidMount() {
    this.updateClusters();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props) {
      // Refresh clusters on project change
      if (this.state.prevProjectId !== this.context.currentProject?.id) {
        this.updateClusters();
        this.setState({ prevProjectId: this.context.currentProject?.id });
      } else if (this.props.forceRefreshClusters === true) {
        this.updateClusters();
        this.props.setRefreshClusters(false);
      }
    }
  }

  showClusterConfigModal = () => {
    this.context.setCurrentModal("ClusterConfigModal", {
      updateClusters: this.updateClusters,
    });
  };

  renderContents = (): React.ReactNode => {
    let { clusters } = this.state;
    let { currentCluster, setCurrentCluster, currentProject } = this.context;

    if (currentProject?.simplified_view_enabled) {
      return null;
    }

    if (
      clusters.length > 0 &&
      currentCluster &&
      !currentProject?.capi_provisioner_enabled
    ) {
      clusters.sort((a, b) => a.id - b.id);

      return clusters.map((cluster: ClusterType, i: number) => {
        return (
          <ClusterSection
            key={i}
            cluster={cluster}
            currentCluster={currentCluster}
            currentProject={currentProject}
            setCurrentCluster={setCurrentCluster}
            navToClusterDashboard={() => {
              setCurrentCluster(cluster, () => {
                pushFiltered(this.props, "/cluster-dashboard", ["project_id"], {
                  cluster: cluster.name,
                });
              });
            }}
          />
        );
      });
    } else if (currentProject?.capi_provisioner_enabled) {
      const cluster = clusters[0];
      return (
        <>
          <NavButton
            path="/applications"
            targetClusterName={cluster?.name}
            active={
              currentCluster?.id === cluster?.id &&
              window.location.pathname.startsWith("/applications")
            }
          >
            <Img src={web} />
            Applications
          </NavButton>
          <NavButton
            path="/jobs"
            targetClusterName={cluster?.name}
            active={
              currentCluster?.id === cluster?.id &&
              window.location.pathname.startsWith("/jobs")
            }
          >
            <Img src={job} />
            Jobs
          </NavButton>
          <NavButton
            path="/env-groups"
            targetClusterName={cluster?.name}
            active={
              currentCluster?.id === cluster?.id &&
              window.location.pathname.startsWith("/env-groups")
            }
          >
            <Img src={sliders} />
            Env groups
          </NavButton>
          {currentCluster?.preview_envs_enabled && (
            <NavButton
              path="/preview-environments"
              targetClusterName={cluster?.name}
              active={
                currentCluster?.id === cluster?.id &&
                window.location.pathname.startsWith("/preview-environments")
              }
            >
              <InlineSVGWrapper
                id="Flat"
                fill="#FFFFFF"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 256"
              >
                <path d="M103.99951,68a36,36,0,1,0-44,35.0929v49.8142a36,36,0,1,0,16,0V103.0929A36.05516,36.05516,0,0,0,103.99951,68Zm-56,0a20,20,0,1,1,20,20A20.0226,20.0226,0,0,1,47.99951,68Zm40,120a20,20,0,1,1-20-20A20.0226,20.0226,0,0,1,87.99951,188ZM196.002,152.907l-.00146-33.02563a55.63508,55.63508,0,0,0-16.40137-39.59619L155.31348,56h20.686a8,8,0,0,0,0-16h-40c-.02978,0-.05859.00415-.08838.00446-.2334.00256-.46631.01245-.69824.03527-.12891.01258-.25391.03632-.38086.05494-.13135.01928-.26318.03424-.39355.06-.14014.02778-.27686.06611-.41455.10114-.11475.02924-.23047.05426-.34424.08862-.13428.04059-.26367.0907-.395.13806-.11524.04151-.231.07929-.34473.12629-.12109.05011-.23681.10876-.35449.16455-.11914.05621-.23926.10907-.356.17144-.11133.0597-.21728.12757-.32519.1922-.11621.06928-.23389.13483-.34668.21051-.11719.07831-.227.16553-.33985.24976-.09668.07227-.1958.1394-.28955.21655-.18652.1529-.36426.31531-.53564.48413-.01612.01593-.03418.02918-.05029.04529-.02051.02051-.0376.04321-.05762.06391-.16358.16711-.32178.33941-.47022.52032-.083.10059-.15527.20648-.23193.31006-.07861.10571-.16064.20862-.23438.3183-.08056.12072-.15087.24591-.2246.36993-.05958.1-.12208.19757-.17725.30036-.06787.12591-.125.25531-.18506.384-.05078.1084-.10547.21466-.15137.32568-.05127.12463-.09326.25189-.13867.37848-.04248.11987-.08887.238-.126.36047-.03857.12775-.06738.25757-.09912.38678-.03125.124-.06591.24622-.0913.37244-.02979.15088-.04786.30328-.06934.45544-.01465.10645-.03516.21094-.0459.31867q-.03955.39752-.04.79706V88a8,8,0,0,0,16,0V67.31378l24.28516,24.28485a39.73874,39.73874,0,0,1,11.71582,28.28321l.00146,33.02533a36.00007,36.00007,0,1,0,16-.00019ZM188.00244,208a20,20,0,1,1,20-20A20.0226,20.0226,0,0,1,188.00244,208Z" />
              </InlineSVGWrapper>
              Preview envs
            </NavButton>
          )}
          <NavButton
            path={"/cluster-dashboard"}
            targetClusterName={cluster?.name}
            active={
              currentCluster?.id === cluster?.id &&
              window.location.pathname.startsWith("/cluster-dashboard")
            }
          >
            <Img enlarge={true} src={settings} />
            Infra settings
          </NavButton>
        </>
      );
    }

    return (
      <InitializeButton
        onClick={() =>
          this.context.setCurrentModal("ClusterInstructionsModal", {})
        }
      >
        <Plus>+</Plus> Connect a Cluster
      </InitializeButton>
    );
  };

  render() {
    return (
      <Wrapper display={this.props.display}>{this.renderContents()}</Wrapper>
    );
  }
}

Clusters.contextType = Context;

export default withRouter(Clusters);

const Wrapper = styled.div<{ display: string }>`
  display: ${(props) => props.display || ""};
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

const Img = styled.img<{ enlarge?: boolean }>`
  padding: ${(props) => (props.enlarge ? "0 0 0 1px" : "4px")};
  height: 22px;
  width: 22px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 8px;
`;

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

const NavButton = styled(SidebarLink)`
  display: flex;
  align-items: center;
  border-radius: 5px;
  position: relative;
  text-decoration: none;
  height: 34px;
  margin: 5px 15px;
  padding: 0 30px 2px 8px;
  font-size: 13px;
  color: ${(props) => props.theme.text.primary};
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: any) => (props.active ? "#ffffff11" : "")};

  :hover {
    background: ${(props: any) => (props.active ? "#ffffff11" : "#ffffff08")};
  }

  > i {
    font-size: 20px;
    padding-top: 4px;
    border-radius: 3px;
    margin-right: 10px;
  }
`;
