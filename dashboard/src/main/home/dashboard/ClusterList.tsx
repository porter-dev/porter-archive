import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { ClusterType, DetailedClusterType } from "shared/types";
import Helper from "components/form-components/Helper";
import { pushFiltered } from "shared/routing";

import { RouteComponentProps, withRouter } from "react-router";

import Modal from "../modals/Modal";
import Heading from "components/form-components/Heading";

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
      } else {
        this.setState({ loading: false, error: "Response data missing" });
      }
    } catch (err) {
      this.setState(err);
    }
  };

  renderIcon = () => {
    return (
      <DashboardIcon>
        <svg
          width="16"
          height="16"
          viewBox="0 0 19 19"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15.207 12.4403C16.8094 12.4403 18.1092 11.1414 18.1092 9.53907C18.1092 7.93673 16.8094 6.63782 15.207 6.63782"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M3.90217 12.4403C2.29983 12.4403 1 11.1414 1 9.53907C1 7.93673 2.29983 6.63782 3.90217 6.63782"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M9.54993 13.4133C7.4086 13.4133 5.69168 11.6964 5.69168 9.55417C5.69168 7.41284 7.4086 5.69592 9.54993 5.69592C11.6913 5.69592 13.4082 7.41284 13.4082 9.55417C13.4082 11.6964 11.6913 13.4133 9.54993 13.4133Z"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M6.66895 15.207C6.66895 16.8094 7.96787 18.1092 9.5702 18.1092C11.1725 18.1092 12.4715 16.8094 12.4715 15.207"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M6.66895 3.90217C6.66895 2.29983 7.96787 1 9.5702 1C11.1725 1 12.4715 2.29983 12.4715 3.90217"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M5.69591 9.54996C5.69591 7.40863 7.41283 5.69171 9.55508 5.69171C11.6964 5.69171 13.4133 7.40863 13.4133 9.54996C13.4133 11.6913 11.6964 13.4082 9.55508 13.4082C7.41283 13.4082 5.69591 11.6913 5.69591 9.54996Z"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </DashboardIcon>
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
            {this.renderIcon()}
            <TemplateTitle>{cluster.name}</TemplateTitle>
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
        {/* <Heading isAtTop>Connected clusters</Heading> */}
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
  margin-top: -7px;
  padding-left: 2px;
  overflow: visible;
`;

const DashboardIcon = styled.div`
  position: relative;
  height: 25px;
  min-width: 25px;
  width: 25px;
  border-radius: 200px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 1px solid #8e94aa;
  > i {
    font-size: 22px;
  }
`;

const TemplateTitle = styled.div`
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const TemplateBlock = styled.div`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  font-weight: 500;
  padding: 15px;
  margin-bottom: 20px;
  align-item: center;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
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
`;
