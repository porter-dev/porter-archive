import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import {
  ClusterType,
  DetailedClusterType,
  DetailedIngressError,
} from "shared/types";
import Helper from "components/form-components/Helper";
import { pushFiltered } from "shared/routing";

import { RouteComponentProps, withRouter } from "react-router";

import CopyToClipboard from "components/CopyToClipboard";
import Loading from "components/Loading";
import Modal from "../modals/Modal";

type PropsType = RouteComponentProps & {
  currentCluster: ClusterType;
};

type StateType = {
  loading: boolean;
  error: string;
  clusters: DetailedClusterType[];
  showErrorModal?: {
    clusterId: number;
    show: boolean;
  };
};

class Templates extends Component<PropsType, StateType> {
  state: StateType = {
    loading: true,
    error: "",
    clusters: [],
    showErrorModal: undefined,
  };

  componentDidMount() {
    this.updateClusterList();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.currentCluster?.name != this.props.currentCluster?.name) {
      this.updateClusterList();
    }
  }

  updateClusterList = async () => {
    try {
      const res = await api.getClusters(
        "<token>",
        {},
        { id: this.context.currentProject.id }
      );

      if (res.data) {
        this.setState({ clusters: res.data, loading: false, error: "" });

        this.state.clusters.forEach((cluster) => {
          this.updateClusterWithDetailedData(cluster.id);
        });
      } else {
        this.setState({ loading: false, error: "Response data missing" });
      }
    } catch (err) {
      this.setState(err);
    }
  };

  updateClusterWithDetailedData = async (clusterId: number) => {
    try {
      const currentClusterIndex = this.state.clusters.findIndex(
        (cluster) => cluster.id === clusterId
      );
      const res = await api.getCluster(
        "<token>",
        {},
        { project_id: this.context.currentProject.id, cluster_id: clusterId }
      );
      if (res.data) {
        this.setState((prevState) => {
          const currentCluster = prevState.clusters[currentClusterIndex];
          prevState.clusters.splice(currentClusterIndex, 1, {
            ...currentCluster,
            ingress_ip: res.data.ingress_ip,
            ingress_error: res.data.ingress_error,
          });
          return prevState;
        });
      }
    } catch (error) {}
  };

  renderIcon = () => {
    return (
      <DashboardIcon>
        <i className="material-icons">device_hub</i>
      </DashboardIcon>
    );
  };

  renderIngressIp = (
    clusterId: number,
    ingressIp: string | undefined,
    ingressError: DetailedIngressError
  ) => {
    if (typeof ingressIp !== "string") {
      return (
        <Url onClick={(e) => e.preventDefault()}>
          <Loading />
        </Url>
      );
    }

    if (!ingressIp.length && ingressError) {
      return (
        <>
          <Url
            onClick={(e) => {
              e.stopPropagation();
              this.setState({ showErrorModal: { clusterId, show: true } });
            }}
          >
            <Bolded>Ingress IP:</Bolded>
            <span>{ingressError.message}</span>
            <i className="material-icons">launch</i>
          </Url>
        </>
      );
    }

    if (!ingressIp.length) {
      return (
        <Url>
          <Bolded>Ingress IP:</Bolded>
          <span>Ingress IP not available</span>
        </Url>
      );
    }

    return (
      <CopyToClipboard
        as={Url}
        text={ingressIp}
        wrapperProps={{ onClick: (e: any) => e.stopPropagation() }}
      >
        <Bolded>Ingress IP:</Bolded>
        <span>{ingressIp}</span>
        <i className="material-icons-outlined">content_copy</i>
      </CopyToClipboard>
    );
  };

  renderClusters = () => {
    return this.state.clusters.map(
      (cluster: DetailedClusterType, i: number) => {
        return (
          <TemplateBlock
            onClick={() => {
              this.context.setCurrentCluster(cluster);
              pushFiltered(this.props, "/applications", ["project_id"], {
                cluster: cluster.name,
              });
            }}
            key={i}
          >
            <TitleContainer>
              {this.renderIcon()}
              <TemplateTitle>{cluster.name}</TemplateTitle>
            </TitleContainer>
            {this.renderIngressIp(
              cluster.id,
              cluster.ingress_ip,
              cluster.ingress_error
            )}
          </TemplateBlock>
        );
      }
    );
  };

  renderErrorModal = () => {
    const clusterError =
      this.state.showErrorModal?.show &&
      this.state.clusters.find(
        (c) => c.id === this.state.showErrorModal?.clusterId
      );
    const ingressError = clusterError?.ingress_error;
    return (
      <>
        {clusterError && (
          <Modal
            onRequestClose={() => this.setState({ showErrorModal: undefined })}
            width="665px"
            height="min-content"
          >
            Porter encountered an error. Full error log:
            <CodeBlock>{ingressError.error}</CodeBlock>
          </Modal>
        )}
      </>
    );
  };

  render() {
    return (
      <StyledClusterList>
        <Helper>Clusters connected to this project:</Helper>
        <TemplateList>{this.renderClusters()}</TemplateList>
        {this.renderErrorModal()}
      </StyledClusterList>
    );
  }
}

Templates.contextType = Context;

export default withRouter(Templates);

const CodeBlock = styled.span`
  display: block;
  background-color: #1b1d26;
  color: white;
  border-radius: 5px;
  font-family: monospace;
  user-select: text;
  max-height: 400px;
  width: 90%;
  margin-left: 5%;
  margin-top: 20px;
  overflow-y: auto;
  padding: 10px;
  overflow-wrap: break-word;
`;

const StyledClusterList = styled.div`
  margin-top: -17px;
  padding-left: 2px;
  overflow: visible;
`;

const TitleContainer = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
`;
const DashboardIcon = styled.div`
  position: relative;
  height: 45px;
  min-width: 45px;
  width: 45px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  margin-bottom: 10px;
  > i {
    font-size: 22px;
  }
`;

const TemplateTitle = styled.div`
  margin-bottom: 0px;
  margin-top: 13px;
  width: 100%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const TemplateBlock = styled.div`
  border: 1px solid #ffffff00;
  align-items: center;
  user-select: none;
  border-radius: 8px;
  display: flex;
  font-size: 13px;
  font-weight: 500;
  padding: 35px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 192px;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  background: #26282f;
  box-shadow: 0 4px 15px 0px #00000055;
  :hover {
    background: #ffffff11;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TemplateList = styled.div`
  overflow-y: auto;
  overflow: visible;
  margin-top: 32px;
  padding-bottom: 150px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Url = styled.a`
  width: 100%;
  font-size: 13px;
  user-select: text;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  > i {
    margin-left: 10px;
    font-size: 15px;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const Bolded = styled.div`
  font-weight: 500;
  color: #ffffff44;
  margin-right: 6px;
  white-space: nowrap;
`;
