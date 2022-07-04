import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { ClusterType } from "shared/types";

import EnvGroup from "./EnvGroup";
import Loading from "components/Loading";
import { getQueryParam, pushQueryParams } from "shared/routing";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  currentCluster: ClusterType;
  namespace: string;
  sortType: string;
  setExpandedEnvGroup: (envGroup: any) => void;
};

type StateType = {
  envGroups: any[];
  loading: boolean;
  error: boolean;
};

const dummyEnvGroups = [
  { name: "sapporo", last_updated: "12", namespace: "default" },
  { name: "backend-staging", last_updated: "4", namespace: "default" },
  { name: "backend-production", last_updated: "7", namespace: "default" },
];

class EnvGroupList extends Component<PropsType, StateType> {
  state = {
    envGroups: [] as any[],
    loading: false,
    error: false,
  };

  updateEnvGroups = async () => {
    const { currentCluster, namespace, sortType } = this.props;
    try {
      const envGroups = await api
        .listEnvGroups(
          "<token>",
          {},
          {
            id: this.context.currentProject.id,
            namespace: this.props.namespace,
            cluster_id: this.props.currentCluster.id,
          }
        )
        .then((res) => res.data);

      let sortedGroups = envGroups;
      switch (this.props.sortType) {
        case "Oldest":
          sortedGroups.sort((a: any, b: any) =>
            Date.parse(a.created_at) > Date.parse(b.created_at) ? 1 : -1
          );
          break;
        case "Alphabetical":
          sortedGroups.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
          break;
        default:
          sortedGroups.sort((a: any, b: any) =>
            Date.parse(a.created_at) > Date.parse(b.created_at) ? -1 : 1
          );
      }

      return sortedGroups;
    } catch (error) {
      console.log(error);
      this.setState({ loading: false, error: true });
    }
  };

  componentDidMount() {
    this.setState({ loading: true });
    this.updateEnvGroups().then((envGroups) => {
      const selectedEnvGroup = getQueryParam(this.props, "selected_env_group");

      if (selectedEnvGroup) {
        // find env group by selectedEnvGroup
        const envGroup = envGroups.find(
          (envGroup: any) => envGroup.name === selectedEnvGroup
        );
        if (envGroup) {
          this.props.setExpandedEnvGroup(envGroup);
          return;
        }
      }
      this.setState({ envGroups, loading: false });
    });
  }

  componentDidUpdate(prevProps: PropsType) {
    // Prevents reload when opening ClusterConfigModal
    if (
      prevProps.currentCluster !== this.props.currentCluster ||
      prevProps.namespace !== this.props.namespace ||
      prevProps.sortType !== this.props.sortType
    ) {
      (this.props.namespace || this.props.namespace === "") &&
        this.updateEnvGroups().then((envGroups) => {
          const selectedEnvGroup = getQueryParam(
            this.props,
            "selected_env_group"
          );

          this.setState({ envGroups, loading: false });

          if (selectedEnvGroup) {
            // find env group by selectedEnvGroup
            const envGroup = envGroups.find(
              (envGroup: any) => envGroup.name === selectedEnvGroup
            );
            if (envGroup) {
              this.props.setExpandedEnvGroup(envGroup);
            } else {
              pushQueryParams(this.props, {}, ["selected_env_group"]);
            }
          }
        });
    }
  }

  handleExpand = (envGroup: any) => {
    pushQueryParams(this.props, { selected_env_group: envGroup.name }, []);
    this.props.setExpandedEnvGroup(envGroup);
  };

  renderEnvGroupList = () => {
    let { loading, error, envGroups } = this.state;

    if (loading || (!this.props.namespace && this.props.namespace !== "")) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error) {
      return (
        <Placeholder>
          <i className="material-icons">error</i> Error connecting to cluster.
        </Placeholder>
      );
    } else if (envGroups.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i>
          No environment groups found in this namespace.
        </Placeholder>
      );
    }

    return this.state.envGroups.map((envGroup: any, i: number) => {
      return (
        <EnvGroup
          key={i}
          envGroup={envGroup}
          setExpanded={() => this.handleExpand(envGroup)}
        />
      );
    });
  };

  render() {
    return <StyledEnvGroupList>{this.renderEnvGroupList()}</StyledEnvGroupList>;
  }
}

EnvGroupList.contextType = Context;

export default withRouter(EnvGroupList);

const Placeholder = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  background: #26282f;
  border-radius: 5px;
  height: 370px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 13px;

  > i {
    font-size: 16px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const StyledEnvGroupList = styled.div`
  padding-bottom: 85px;
`;
