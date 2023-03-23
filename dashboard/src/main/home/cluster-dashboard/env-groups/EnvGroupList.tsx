import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { ClusterType } from "shared/types";

import EnvGroup from "./EnvGroup";
import Loading from "components/Loading";
import { getQueryParam, pushQueryParams } from "shared/routing";
import { RouteComponentProps, withRouter } from "react-router";

import Placeholder from "components/Placeholder";

type Props = RouteComponentProps & {
  currentCluster: ClusterType;
  namespace: string;
  sortType: string;
  setExpandedEnvGroup: (envGroup: any) => void;
};

type State = {
  envGroups: any[];
  loading: boolean;
  error: boolean;
};

const EnvGroupList: React.FunctionComponent<Props> = (props) => {
  const context = useContext(Context);

  const { currentCluster, namespace, sortType, setExpandedEnvGroup } = props;

  const [envGroups, setEnvGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const updateEnvGroups = async () => {
    let { currentProject, currentCluster } = context;
    try {
      const envGroups = await api
        .listEnvGroups(
          "<token>",
          {},
          {
            id: currentProject.id,
            namespace: namespace,
            cluster_id: currentCluster.id,
          }
        )
        .then((res) => {
          return res.data;
        });

      let sortedGroups = envGroups;
      switch (sortType) {
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
      setIsLoading(false);
      setHasError(true);
    }
  };

  useEffect(() => {
    // Prevents reload when opening ClusterConfigModal
    (namespace || namespace === "") &&
      updateEnvGroups().then((envGroups) => {
        const selectedEnvGroup = getQueryParam(props, "selected_env_group");

        setEnvGroups(envGroups);
        if (envGroups && envGroups.length > 0) {
          setHasError(false);
        }
        setIsLoading(false);

        if (selectedEnvGroup) {
          // find env group by selectedEnvGroup
          const envGroup = envGroups.find(
            (envGroup: any) => envGroup.name === selectedEnvGroup
          );
          if (envGroup) {
            setExpandedEnvGroup(envGroup);
          } else {
            pushQueryParams(props, {}, ["selected_env_group"]);
          }
        }
      });
  }, [currentCluster, namespace, sortType]);

  const renderEnvGroupList = () => {
    if (isLoading || (!namespace && namespace !== "")) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (hasError) {
      return (
        <Placeholder height="370px">
          <i className="material-icons">error</i> Error connecting to cluster.
        </Placeholder>
      );
    } else if (envGroups.length === 0) {
      return (
        <Placeholder height="370px">
          <i className="material-icons">category</i>
          No environment groups found with the given filters.
        </Placeholder>
      );
    }

    return envGroups.map((envGroup: any, i: number) => {
      return (
        <EnvGroup
          key={i}
          envGroup={envGroup}
        />
      );
    });
  };

  return <StyledEnvGroupList>{renderEnvGroupList()}</StyledEnvGroupList>;
};

export default withRouter(EnvGroupList);

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const StyledEnvGroupList = styled.div`
  padding-bottom: 85px;
`;
