import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import gradient from "assets/gradient.jpg";

import api from "shared/api";
import { Context } from "shared/Context";

import SaveButton from "components/SaveButton";
import InputRow from "components/values-form/InputRow";
import ConfirmOverlay from "components/ConfirmOverlay";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  setRefreshClusters: (x: boolean) => void;
};

type StateType = {
  clusterName: string;
  status: string | null;
  showDeleteOverlay: boolean;
};

class UpdateClusterModal extends Component<PropsType, StateType> {
  state = {
    clusterName: this.context.currentCluster.name,
    status: null as string | null,
    showDeleteOverlay: false,
  };

  catchErr = (err: any) => {
    this.setState({ status: "error" });
    console.log(err);
  };

  handleDelete = () => {
    let { currentProject, currentCluster } = this.context;
    this.setState({ status: "loading" });

    api
      .deleteCluster(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((_) => {
        if (!currentCluster?.infra_id) {
          // TODO: make this more declarative from the Home component
          this.props.setRefreshClusters(true);
          this.setState({ status: "successful", showDeleteOverlay: false });
          this.context.setCurrentModal(null, null);
          this.props.history.push("dashboard?tab=overview");
          return;
        }

        // Handle destroying infra we've provisioned
        switch (currentCluster.service) {
          case "eks":
            api
              .destroyEKS(
                "<token>",
                { eks_name: currentCluster.name },
                {
                  project_id: currentProject.id,
                  infra_id: currentCluster.infra_id,
                }
              )
              .then(() => console.log("destroyed provisioned infra."))
              .catch(this.catchErr);
            break;
          case "gke":
            api
              .destroyGKE(
                "<token>",
                { gke_name: currentCluster.name },
                {
                  project_id: currentProject.id,
                  infra_id: currentCluster.infra_id,
                }
              )
              .then(() => console.log("destroyed provisioned infra."))
              .catch(this.catchErr);
            break;

          case "doks":
            api
              .destroyDOKS(
                "<token>",
                { doks_name: currentCluster.name },
                {
                  project_id: currentProject.id,
                  infra_id: currentCluster.infra_id,
                }
              )
              .then(() => console.log("destroyed provisioned infra."))
              .catch(this.catchErr);
            break;
        }

        this.props.setRefreshClusters(true);
        this.setState({ status: "successful", showDeleteOverlay: false });
        this.context.setCurrentModal(null, null);
      })
      .catch(this.catchErr);
  };

  renderWarning = () => {
    let { currentCluster } = this.context;
    if (!currentCluster?.infra_id || !currentCluster.service) {
      return (
        <Warning highlight={true}>
          ⚠️ Since this cluster was not provisioned by Porter, deleting the
          cluster will only detach this cluster from your project. To delete the
          cluster itself, you must do so manually.
        </Warning>
      );
    }

    return (
      <Warning highlight={true}>
        ⚠️ Deletion may result in dangling resources. For a guide on
        how to delete dangling resources, click on the Help Button below. 
      </Warning>
    );
  };

  render() {
    return (
      <StyledUpdateProjectModal>
        <CloseButton
          onClick={() => {
            this.context.setCurrentModal(null, null);
          }}
        >
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Cluster Settings</ModalTitle>
        <Subtitle>Cluster name</Subtitle>

        <InputWrapper>
          <DashboardIcon>
            <i className="material-icons">device_hub</i>
          </DashboardIcon>
          <InputRow
            disabled={true}
            type="string"
            value={this.state.clusterName}
            setValue={(x: string) => this.setState({ clusterName: x })}
            placeholder="ex: perspective-vortex"
            width="470px"
          />
        </InputWrapper>

        {this.renderWarning()}

        <Help
          href="https://docs.getporter.dev/docs/deleting-dangling-resources"
          target="_blank"
        >
          <i className="material-icons">help_outline</i> Help
        </Help>

        <SaveButton
          text="Delete Cluster"
          color="#b91133"
          onClick={() => this.setState({ showDeleteOverlay: true })}
          status={this.state.status}
        />

        <ConfirmOverlay
          show={this.state.showDeleteOverlay}
          message={`Are you sure you want to delete this cluster?`}
          onYes={this.handleDelete}
          onNo={() => this.setState({ showDeleteOverlay: false })}
        />
      </StyledUpdateProjectModal>
    );
  }
}

UpdateClusterModal.contextType = Context;

export default withRouter(UpdateClusterModal);

const Help = styled.a`
  position: absolute;
  left: 31px;
  bottom: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff55;
  font-size: 13px;
  :hover {
    color: #ffffff;
  }

  > i {
    margin-right: 9px;
    font-size: 16px;
  }
`;

const Warning = styled.div`
  font-size: 13px;
  display: flex;
  border-radius: 3px;
  width: calc(100%);
  margin-top: 10px;
  margin-left: 2px;
  line-height: 1.4em;
  align-items: center;
  color: white;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
`;

const DashboardIcon = styled.div`
  width: 25px;
  min-width: 25px;
  height: 25px;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-right: 10px;
  font-weight: 400;
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  color: white;

  > i {
    font-size: 13px;
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Subtitle = styled.div`
  margin-top: 23px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: -10px;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: "Assistant";
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledUpdateProjectModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;
