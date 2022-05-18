import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";

import { Context } from "shared/Context";
import { ClusterType } from "shared/types";
import { RouteComponentProps, withRouter } from "react-router";
import { pushFiltered } from "shared/routing";
import { Tooltip } from "@material-ui/core";

type PropsType = RouteComponentProps & {
  toggleDrawer: () => void;
  showDrawer: boolean;
  clusters: ClusterType[];
};

type StateType = {};

class Drawer extends Component<PropsType, StateType> {
  renderClusterList = (): JSX.Element[] | JSX.Element => {
    let { clusters } = this.props;
    let { currentCluster, setCurrentCluster } = this.context;

    if (clusters.length > 0 && currentCluster) {
      clusters.sort((a, b) => a.id - b.id);

      return clusters.map((cluster: ClusterType, i: number) => {
        /*
        let active = this.context.activeProject &&
          this.context.activeProject.namespace == val.namespace; 
        */

        return (
          <ClusterOption
            key={i}
            active={cluster.name === currentCluster.name}
            onClick={() => {
              setCurrentCluster(cluster, () => {
                pushFiltered(this.props, "/cluster-dashboard", ["project_id"], {
                  cluster: cluster.name,
                });
              });
            }}
          >
            <ClusterIcon>
              <i className="material-icons">device_hub</i>
            </ClusterIcon>
            <Tooltip title={cluster?.name}>
              <ClusterName>{cluster.name}</ClusterName>
            </Tooltip>
          </ClusterOption>
        );
      });
    }

    return <Placeholder>No clusters selected</Placeholder>;
  };

  renderCloseOverlay = (): JSX.Element | undefined => {
    if (this.props.showDrawer) {
      return <CloseOverlay onClick={this.props.toggleDrawer} />;
    }
  };

  render() {
    return (
      <div>
        {this.renderCloseOverlay()}
        <StyledDrawer showDrawer={this.props.showDrawer}>
          <CloseButton onClick={this.props.toggleDrawer}>
            <CloseButtonImg src={close} />
          </CloseButton>

          {this.renderClusterList()}

          <InitializeButton
            onClick={() => {
              this.context.setCurrentModal("ClusterInstructionsModal", {});
            }}
          >
            <Plus>+</Plus> Connect a Cluster
          </InitializeButton>
        </StyledDrawer>
      </div>
    );
  }
}

Drawer.contextType = Context;

export default withRouter(Drawer);

const Plus = styled.div`
  margin-right: 10px;
  font-size: 15px;
`;

const ButtonLabel = styled.div`
  display: inline-block;
  font-size: 14px;
  position: absolute;
  top: 11px;
  left: 61px;
`;

const InitializeButton = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 30px);
  height: 38px;
  margin: 45px 15px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 3px;
  color: #ffffff;
  padding-bottom: 3px;
  cursor: pointer;
  background: #ffffff22;

  :hover {
    background: #ffffff33;
  }
`;

const ClusterOption = styled.div`
  width: 100%;
  padding: 2px 7px;
  padding-right: 30px;
  display: flex;
  align-items: center;
  height: 42px;
  text-decoration: none;
  color: white;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  background: ${(props: { active?: boolean }) =>
    props.active ? "#ffffff18" : ""};
  :hover {
    background: #ffffff22;
  }
`;

const Placeholder = styled(ClusterOption)`
  color: #ffffff99;
  justify-content: center;
  padding: 0;
  cursor: default;
  :hover {
    background: none;
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
    margin-bottom: 0px;
    margin-left: 17px;
    margin-right: 10px;
  }
`;

const StyledDrawer = styled.div`
  position: absolute;
  height: 100%;
  padding-top: 41px;
  width: 230px;
  overflow-y: auto;
  padding-bottom: 40px;
  top: 0;
  left: ${(props: { showDrawer: boolean }) =>
    props.showDrawer ? "-30px" : "200px"};
  z-index: -2;
  background: #00000fd4;
  animation: ${(props: { showDrawer: boolean }) =>
    props.showDrawer ? "slideDrawerRight 0.4s" : "slideDrawerLeft 0.4s"};
  animation-fill-mode: forwards;
  @keyframes slideDrawerRight {
    from {
      left: -30px;
      opacity: 0;
    }
    to {
      left: 200px;
      opacity: 1;
    }
  }
  @keyframes slideDrawerLeft {
    from {
      left: 200px;
      opacity: 1;
    }
    to {
      left: -30px;
      opacity: 0;
    }
  }
`;

const ClusterName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 3px;
`;
