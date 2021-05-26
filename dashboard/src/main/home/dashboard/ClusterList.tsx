import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { ClusterType } from "shared/types";
import Helper from "components/values-form/Helper";

import { RouteComponentProps, withRouter } from "react-router";

import CopyToClipboard from "components/CopyToClipboard";

type PropsType = RouteComponentProps & {
  currentCluster: ClusterType;
};

type StateType = {
  loading: boolean;
  error: string;
  clusters: ClusterType[];
};

class Templates extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: "",
    clusters: [] as ClusterType[],
  };

  componentDidMount() {
    this.updateClusterList();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.currentCluster?.name != this.props.currentCluster?.name) {
      this.updateClusterList();
    }
  }

  updateClusterList = () => {
    api
      .getClusters("<token>", {}, { id: this.context.currentProject.id })
      .then((res) => {
        if (res.data) {
          this.setState({ clusters: res.data, loading: false, error: "" });
        } else {
          this.setState({ loading: false, error: "Response data missing" });
        }
      })
      .catch((err) => this.setState(err));
  };

  renderIcon = () => {
    return (
      <DashboardIcon>
        <i className="material-icons">device_hub</i>
      </DashboardIcon>
    );
  };

  renderClusters = () => {
    return this.state.clusters.map((cluster: ClusterType, i: number) => {
      return (
        <TemplateBlock
          onClick={() => {
            this.context.setCurrentCluster(cluster);
            this.props.history.push("applications");
          }}
          key={i}
        >
          <TitleContainer>
            {this.renderIcon()}
            <TemplateTitle>{cluster.name}</TemplateTitle>
          </TitleContainer>
          <Url onClick={(e) => e.stopPropagation()}>
            <CopyToClipboard text={cluster.server} />
            <Bolded>Cluster IP:</Bolded>
            <span>{cluster.server}</span>
            <i className="material-icons-outlined">content_copy</i>
          </Url>
        </TemplateBlock>
      );
    });
  };

  render() {
    return (
      <StyledClusterList>
        <Helper>Clusters connected to this project:</Helper>
        <TemplateList>{this.renderClusters()}</TemplateList>
      </StyledClusterList>
    );
  }
}

Templates.contextType = Context;

export default withRouter(Templates);

const StyledClusterList = styled.div`
  margin-top: -17px;
  padding-left: 2px;
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
  width: 80%;
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
  border-radius: 5px;
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
  box-shadow: 0 5px 8px 0px #00000033;
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
  margin-top: 32px;
  padding-bottom: 150px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 18px;
      margin-left: 18px;
      color: #858faaaa;
      cursor: pointer;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const TemplatesWrapper = styled.div`
  width: calc(90% - 150px);
  min-width: 300px;
  padding-top: 50px;
`;

const Url = styled.a`
  width: 100%;
  font-size: 13px;
  user-select: text;
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
