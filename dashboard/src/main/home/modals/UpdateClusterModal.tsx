import React, { Component } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import ConfirmOverlay from "components/ConfirmOverlay";
import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import { OFState } from "main/home/onboarding/state";

import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";
import { NilCluster } from "shared/types";
import close from "assets/close.png";

import { Onboarding as OnboardingSaveType } from "../onboarding/types";

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

  handleDelete = async () => {
    const { currentProject, currentCluster, setCurrentCluster } = this.context;
    this.setState({ status: "loading" });

    await api.updateOnboardingStep(
      "<token>",
      { step: "cluster-delete" },
      { project_id: currentProject.id }
    );

    api
      .deleteCluster(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(async (_) => {
        if (!currentCluster?.infra_id) {
          // TODO: make this more declarative from the Home component
          this.props.setRefreshClusters(true);
          this.setState({ status: "successful", showDeleteOverlay: false });
          this.context.setCurrentModal(null, null);
          pushFiltered(this.props, "/dashboard", ["project_id"], {
            tab: "overview",
          });

          // Handle destroying infra we've provisioned
          api
            .destroyInfra(
              "<token>",
              {},
              {
                project_id: currentProject.id,
                infra_id: currentCluster.infra_id,
              }
            )
            .then(() => {
              console.log(
                "destroyed provisioned infra:",
                currentCluster.infra_id
              );
            })
            .catch(console.log);

          if (currentProject.simplified_view_enabled) {
            await api
              .getClusters("<token>", {}, { id: currentProject?.id })
              .then(async (res) => {
                if (res.data) {
                  const clusters = res.data;
                  if (clusters.length === 0 || !currentProject.multi_cluster) {
                    setCurrentCluster(NilCluster);
                    await api.saveOnboardingState(
                      "<token>",
                      { current_step: "connect_source" },
                      { project_id: currentProject.id }
                    );
                    window.location.reload();
                  }
                }
              });
          }
          return;
        }

        this.props.setRefreshClusters(true);
        this.setState({ status: "successful", showDeleteOverlay: false });
        this.context.setCurrentModal(null, null);
      })
      .catch(this.catchErr);
  };

  renderWarning = () => {
    // let { currentCluster } = this.context;
    // if (!currentCluster?.infra_id || !currentCluster.service) {
    //   return (
    //     <Warning highlight={true}>
    //       ⚠️ Deleting the cluster will only detach this cluster from your project. To delete resources you must do so manually.
    //     </Warning>
    //   );
    // }

    return (
      <Warning highlight={true}>
        ⚠️ Deletion may result in dangling resources. For a guide on how to
        delete dangling resources, click on the Help Button below.
      </Warning>
    );
  };

  render() {
    return (
      <>
        <Subtitle>Cluster name</Subtitle>

        <InputWrapper>
          <DashboardIcon>
            <i className="material-icons">device_hub</i>
          </DashboardIcon>
          <InputRow
            disabled={true}
            type="string"
            value={this.state.clusterName}
            setValue={(x: string) => {
              this.setState({ clusterName: x });
            }}
            placeholder="ex: perspective-vortex"
            width="490px"
          />
        </InputWrapper>

        {this.renderWarning()}

        <Help
          href="https://docs.porter.run/other/deleting-dangling-resources"
          target="_blank"
        >
          <i className="material-icons">help_outline</i> How to delete resources
        </Help>

        <SaveButton
          text="Delete cluster"
          color="#b91133"
          onClick={() => {
            this.setState({ showDeleteOverlay: true });
          }}
          status={this.state.status}
        />

        <ConfirmOverlay
          show={this.state.showDeleteOverlay}
          message={`Are you sure you want to delete this cluster?`}
          onYes={this.handleDelete}
          onNo={() => {
            this.setState({ showDeleteOverlay: false });
          }}
        />
      </>
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
  z-index: 999;
  justify-content: center;
  color: #ffffff55;
  font-size: 13px;
  :hover {
    color: #ffffff;
  }

  > i {
    margin-right: 5px;
    font-size: 14px;
  }
`;

const Warning = styled.div`
  font-size: 13px;
  display: flex;
  border-radius: 3px;
  width: calc(100%);
  margin-top: 10px;
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
  width: 35px;
  min-width: 35px;
  height: 35px;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-right: 10px;
  font-weight: 400;
  margin-top: 8px;
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
