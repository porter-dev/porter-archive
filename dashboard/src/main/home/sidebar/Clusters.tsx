import React, { Component } from "react";
import styled from "styled-components";

import api from "shared/api";
import { pushFiltered } from "shared/routing";
import { Context } from "shared/Context";
import { ClusterType } from "shared/types";
import { ClusterSection } from "./ClusterSection";

import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  setWelcome: (x: boolean) => void;
  currentView: string;
  isSelected: boolean;
  forceRefreshClusters: boolean;
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
    prevProjectId: this.context.currentProject.id,
  };

  updateClusters = () => {
    let {
      user,
      currentProject,
      setCurrentCluster,
      currentCluster,
    } = this.context;

    // TODO: query with selected filter once implemented
    api
      .getClusters("<token>", {}, { id: currentProject.id })
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
              localStorage.getItem(currentProject.id + "-cluster")
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
      if (this.state.prevProjectId !== this.context.currentProject.id) {
        this.updateClusters();
        this.setState({ prevProjectId: this.context.currentProject.id });
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

  renderContents = (): JSX.Element[] | JSX.Element => {
    let { clusters } = this.state;
    let { currentCluster, setCurrentCluster, currentProject } = this.context;

    if (clusters.length > 0 && currentCluster) {
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
    return <>{this.renderContents()}</>;
  }
}

Clusters.contextType = Context;

export default withRouter(Clusters);

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