import React, { Component, useContext, useEffect, useState } from "react";
import styled from "styled-components";

import sliders from "assets/sliders.svg";

import { Context } from "shared/Context";
import { ClusterType } from "shared/types";

import ExpandedEnvGroup from "./ExpandedEnvGroup";
import { RouteComponentProps, useParams, withRouter } from "react-router";
import { getQueryParam, pushQueryParams } from "shared/routing";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import { useQuery } from "@tanstack/react-query";
import api from "shared/api";
import Loading from "components/Loading";
import Placeholder from "components/Placeholder";

type PropsType = RouteComponentProps &
  WithAuthProps & {
    currentCluster: ClusterType;
  };

const EnvGroupDashboard = (props: PropsType) => {
  const namespace = getQueryParam(props, "namespace");
  const params = useParams<{ name: string }>();
  const { currentProject } = useContext(Context);
  const [expandedEnvGroup, setExpandedEnvGroup] = useState<any>();
  const isTabActive = () => {
    return !document.hidden;
  };

  const {
    data: envGroups,
    isLoading: listEnvGroupsLoading,
    isError,
    refetch,
  } = useQuery<any[]>(
    ["envGroupList", currentProject.id, namespace, props.currentCluster.id],
    async () => {
      try {
        if (!namespace) {
          return [];
        }

        const res = await api.listEnvGroups(
          "<token>",
          {},
          {
            id: currentProject.id,
            namespace: namespace,
            cluster_id: props.currentCluster.id,
          }
        );

        return res.data;
      } catch (err) {
        throw err;
      }
    },
    {
      enabled: false, // Initially disable the query
    }
  );

  useEffect(() => {
    const name = params.name;

    if (!envGroups || !isTabActive()) {
      return;
    }

    const envGroup = envGroups.find((envGroup) => envGroup.name === name);

    setExpandedEnvGroup(envGroup);
  }, [envGroups, params]);

  useEffect(() => {
    if (isTabActive()) {
      refetch(); // Run the query when the component mounts and the tab is active
    }
  }, []);
  if (listEnvGroupsLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  const renderContents = () => {
    if (!expandedEnvGroup) {
      return null;
    }

    return (
      <ExpandedEnvGroup
        isAuthorized={props.isAuthorized}
        namespace={expandedEnvGroup?.namespace ?? namespace}
        currentCluster={props.currentCluster}
        envGroup={expandedEnvGroup}
        closeExpanded={() => props.history.push("/env-groups")}
      />
    );
  };

  if (listEnvGroupsLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  return <>{renderContents()}</>;
};

export default withRouter(withAuth(EnvGroupDashboard));

const Flex = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 30px solid transparent;
`;

const SortFilterWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  border-bottom: 30px solid transparent;
  > div:not(:first-child) {
  }
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: ${(props: { hasMultipleChilds: boolean }) => {
    if (props.hasMultipleChilds) {
      return "space-between";
    }
    return "flex-end";
  }};
  align-items: center;
  flex-wrap: wrap;
`;

const Button = styled.div`
  display: flex;
  margin-left: 10px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  color: white;
  height: 30px;
  padding: 0 8px;
  min-width: 155px;
  padding-right: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
