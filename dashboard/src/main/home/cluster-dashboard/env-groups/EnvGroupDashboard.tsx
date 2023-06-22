import React, { Component, useContext, useEffect, useState } from "react";
import styled from "styled-components";

import sliders from "assets/sliders.svg";
import loading from "assets/loading.gif";

import { Context } from "shared/Context";
import { ClusterType } from "shared/types";

import DashboardHeader from "../DashboardHeader";
import { NamespaceSelector } from "../NamespaceSelector";
import SortSelector from "../SortSelector";
import EnvGroupList from "./EnvGroupList";
import CreateEnvGroup from "./CreateEnvGroup";
import ExpandedEnvGroup from "./ExpandedEnvGroup";
import { RouteComponentProps, withRouter } from "react-router";
import { getQueryParam, pushQueryParams, pushFiltered } from "shared/routing";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Spacer from "components/porter/Spacer";

type PropsType = RouteComponentProps &
  WithAuthProps & {
    currentCluster: ClusterType;
  };

type StateType = {
  expand: boolean;
  update: any[];
  sortType: string;
  expandedEnvGroup: any;
  namespace: string;
  createEnvMode: boolean;
};

const EnvGroupDashboard = (props: PropsType) => {
  const [state, setState] = useState<StateType>({
    expand: false,
    update: [] as any[],
    namespace: null as string,
    expandedEnvGroup: null as any,
    createEnvMode: false,
    sortType: localStorage.getItem("SortType")
      ? localStorage.getItem("SortType")
      : "Newest",
  });

  const { currentProject } = useContext(Context);

  const setNamespace = (namespace: string) => {
    setState((state) => ({ ...state, namespace }));
    pushQueryParams(props, {
      namespace: namespace ?? "ALL",
    });
  };

  const setSortType = (sortType: string) => {
    setState((state) => ({ ...state, sortType }));
  };

  const toggleCreateEnvMode = () => {
    setState((state) => ({
      ...state,
      createEnvMode: !state.createEnvMode,
    }));
  };

  const setExpandedEnvGroup = (envGroup: any | null) => {
    setState((state) => ({ ...state, expandedEnvGroup: envGroup }));
  };

  const closeExpanded = () => {
    pushQueryParams(props, {}, ["selected_env_group"]);
    const redirectUrlOnClose = getQueryParam(props, "redirect_url");
    if (redirectUrlOnClose) {
      props.history.push(redirectUrlOnClose);
      return;
    }
    setExpandedEnvGroup(null);
  };

  const renderBody = () => {
    if (props.currentCluster.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />
    }

    const goBack = () =>
      setState((state) => ({ ...state, createEnvMode: false }));

    if (state.createEnvMode) {
      return (
        <CreateEnvGroup goBack={goBack} currentCluster={props.currentCluster} />
      );
    } else {
      const isAuthorizedToAdd = props.isAuthorized("env_group", "", [
        "get",
        "create",
      ]);

      return (
        <>
          <ControlRow hasMultipleChilds={isAuthorizedToAdd}>
            <SortFilterWrapper>
              <SortSelector
                currentView="env-groups"
                setSortType={setSortType}
                sortType={state.sortType}
              />
              <Spacer inline width="10px" />
              {!currentProject?.capi_provisioner_enabled && (
                <NamespaceSelector
                  setNamespace={setNamespace}
                  namespace={state.namespace}
                />
              )}
            </SortFilterWrapper>
            <Flex>
              {isAuthorizedToAdd && (
                <Button onClick={toggleCreateEnvMode}>
                  <i className="material-icons">add</i> Create env group
                </Button>
              )}
            </Flex>
          </ControlRow>

          <EnvGroupList
            currentCluster={props.currentCluster}
            namespace={currentProject?.capi_provisioner_enabled ? "default" : state.namespace}
            sortType={state.sortType}
            setExpandedEnvGroup={setExpandedEnvGroup}
          />
        </>
      );
    }
  };

  const renderContents = () => {
    if (state.expandedEnvGroup) {
      return (
        <ExpandedEnvGroup
          isAuthorized={props.isAuthorized}
          namespace={state.expandedEnvGroup?.namespace || state.namespace}
          currentCluster={props.currentCluster}
          envGroup={state.expandedEnvGroup}
          closeExpanded={() => closeExpanded()}
        />
      );
    } else {
      return (
        <>
          <DashboardHeader
            image={sliders}
            title="Environment groups"
            description="Groups of environment variables for storing secrets and configuration."
            disableLineBreak
            capitalize={false}
          />
          {renderBody()}
        </>
      );
    }
  };

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
