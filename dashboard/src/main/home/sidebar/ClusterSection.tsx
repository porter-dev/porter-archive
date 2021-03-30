import React, { Component } from "react";
import styled from "styled-components";
import drawerBg from "assets/drawer-bg.png";

import api from "shared/api";
import { Context } from "shared/Context";
import { ClusterType } from "shared/types";

import Drawer from "./Drawer";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  forceCloseDrawer: boolean;
  releaseDrawer: () => void;
  setWelcome: (x: boolean) => void;
  currentView: string;
  isSelected: boolean;
  forceRefreshClusters: boolean;
  setRefreshClusters: (x: boolean) => void;
};

type StateType = {
  showDrawer: boolean;
  initializedDrawer: boolean;
  clusters: ClusterType[];

  // Track last project id for refreshing clusters on project change
  prevProjectId: number;
};

class ClusterSection extends Component<PropsType, StateType> {
  // Need to track initialized for animation mounting
  state = {
    showDrawer: false,
    initializedDrawer: false,
    clusters: [] as ClusterType[],
    prevProjectId: this.context.currentProject.id,
  };

  updateClusters = () => {
    let { user, currentProject, setCurrentCluster } = this.context;

    // TODO: query with selected filter once implemented
    api
      .getClusters("<token>", {}, { id: currentProject.id })
      .then((res) => {
        window.analytics.identify(user.userId, {
          currentProject,
          clusters: res.data,
        });

        this.props.setWelcome(false);
        // TODO: handle uninitialized kubeconfig
        if (res.data) {
          let clusters = res.data;
          clusters.sort((a: any, b: any) => a.id - b.id);
          if (clusters.length > 0) {
            this.setState({ clusters });
            let saved = JSON.parse(
              localStorage.getItem(currentProject.id + "-cluster")
            );
            if (saved !== "null") {
              setCurrentCluster(clusters[0]);
              for (let i = 0; i < clusters.length; i++) {
                if (
                  clusters[i].id === saved.id &&
                  clusters[i].project_id === saved.project_id &&
                  clusters[i].name === saved.name
                ) {
                  setCurrentCluster(clusters[i]);
                  break;
                }
              }
            } else {
              setCurrentCluster(clusters[0]);
            }
          } else if (
            this.props.currentView !== "provisioner" &&
            this.props.currentView !== "new-project"
          ) {
            this.setState({ clusters: [] });
            setCurrentCluster(null);
            // this.props.history.push("dashboard?tab=overview");
          }
        }
      })
      .catch((err) => this.props.setWelcome(true));
  };

  componentDidMount() {
    this.updateClusters();
  }

  // Need to override showDrawer when the sidebar is closed
  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props) {
      // Refresh clusters on project change
      if (this.state.prevProjectId !== this.context.currentProject.id) {
        this.updateClusters();
        this.setState({ prevProjectId: this.context.currentProject.id });
      } else if (this.props.forceRefreshClusters === true) {
        this.updateClusters();
        this.props.setRefreshClusters(false);
      }

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
          toggleDrawer={this.toggleDrawer}
          showDrawer={this.state.showDrawer}
          clusters={this.state.clusters}
        />
      );
    }
  };

  showClusterConfigModal = () => {
    this.context.setCurrentModal("ClusterConfigModal", {
      updateClusters: this.updateClusters,
    });
  };

  renderContents = (): JSX.Element => {
    let { clusters, showDrawer } = this.state;
    let { currentCluster } = this.context;

    if (clusters.length > 0) {
      return (
        <ClusterSelector isSelected={this.props.isSelected}>
          <LinkWrapper
            onClick={() => this.props.history.push("cluster-dashboard")}
          >
            <ClusterIcon>
              <i className="material-icons">device_hub</i>
            </ClusterIcon>
            <ClusterName>{currentCluster && currentCluster.name}</ClusterName>
          </LinkWrapper>
          <DrawerButton onClick={this.toggleDrawer}>
            <BgAccent src={drawerBg} />
            <DropdownIcon showDrawer={showDrawer}>
              <i className="material-icons">arrow_drop_down</i>
            </DropdownIcon>
          </DrawerButton>
        </ClusterSelector>
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
      <div>
        {this.renderDrawer()}
        {this.renderContents()}
      </div>
    );
  }
}

ClusterSection.contextType = Context;

export default withRouter(ClusterSection);

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
  background: #819bfd;
  width: 30px;
  border-top-left-radius: 100px;
  max-width: 30px;
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
  font-weight: 400;
`;

const DropdownIcon = styled.span`
  position: absolute;
  right: ${(props: { showDrawer: boolean }) =>
    props.showDrawer ? "-2px" : "2px"};
  top: 10px;
  > i {
    font-size: 18px;
  }
  -webkit-transform: ${(props: { showDrawer: boolean }) =>
    props.showDrawer ? "rotate(-90deg)" : "rotate(90deg)"};
  transform: ${(props: { showDrawer: boolean }) =>
    props.showDrawer ? "rotate(-90deg)" : "rotate(90deg)"};
  animation: ${(props: { showDrawer: boolean }) =>
    props.showDrawer ? "rotateLeft 0.5s" : "rotateRight 0.5s"};
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
    margin-bottom: 0px;
    margin-left: 17px;
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
  background: ${(props: { isSelected: boolean }) =>
    props.isSelected ? "#ffffff11" : ""};
  z-index: 1;

  :hover {
    background: ${(props: { isSelected: boolean }) =>
      props.isSelected ? "" : "#ffffff08"};
  }
`;
