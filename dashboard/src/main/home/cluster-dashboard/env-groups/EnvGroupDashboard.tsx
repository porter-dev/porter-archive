import React, { Component } from "react";
import styled from "styled-components";

import sliders from "assets/sliders.svg";

import { Context } from "shared/Context";
import { ClusterType } from "shared/types";

import DashboardHeader from "../DashboardHeader";
import { NamespaceSelector } from "../NamespaceSelector";
import SortSelector from "../SortSelector";
import EnvGroupList from "./EnvGroupList";
import CreateEnvGroup from "./CreateEnvGroup";
import ExpandedEnvGroup from "./ExpandedEnvGroup";
import { RouteComponentProps, withRouter } from "react-router";
import { getQueryParam, pushQueryParams } from "shared/routing";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

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

class EnvGroupDashboard extends Component<PropsType, StateType> {
  state = {
    expand: false,
    update: [] as any[],
    namespace: null as string,
    expandedEnvGroup: null as any,
    createEnvMode: false,
    sortType: localStorage.getItem("SortType")
      ? localStorage.getItem("SortType")
      : "Newest",
  };

  renderBody = () => {
    if (this.state.createEnvMode) {
      return (
        <CreateEnvGroup
          goBack={() => this.setState({ createEnvMode: false })}
          currentCluster={this.props.currentCluster}
        />
      );
    } else {
      const isAuthorizedToAdd = this.props.isAuthorized("env_group", "", [
        "get",
        "create",
      ]);
      return (
        <>
          <ControlRow hasMultipleChilds={isAuthorizedToAdd}>
            <SortFilterWrapper>
              <NamespaceSelector
                setNamespace={(namespace) =>
                  this.setState({ namespace }, () => {
                    pushQueryParams(this.props, {
                      namespace: this.state.namespace || "ALL",
                    });
                  })
                }
                namespace={this.state.namespace}
              />
            </SortFilterWrapper>
            <Flex>
              <SortSelector
                currentView="env-groups"
                setSortType={(sortType) => this.setState({ sortType })}
                sortType={this.state.sortType}
              />
              {isAuthorizedToAdd && (
                <Button
                  onClick={() =>
                    this.setState({ createEnvMode: !this.state.createEnvMode })
                  }
                >
                  <i className="material-icons">add</i> Create env group
                </Button>
              )}
            </Flex>
          </ControlRow>

          <EnvGroupList
            currentCluster={this.props.currentCluster}
            namespace={this.state.namespace}
            sortType={this.state.sortType}
            setExpandedEnvGroup={(envGroup: any) => {
              this.setState({ expandedEnvGroup: envGroup });
            }}
          />
        </>
      );
    }
  };

  closeExpanded = () => {
    pushQueryParams(this.props, {}, ["selected_env_group"]);
    const redirectUrlOnClose = getQueryParam(this.props, "redirect_url");
    if (redirectUrlOnClose) {
      this.props.history.push(redirectUrlOnClose);
      return;
    }
    this.setState({ expandedEnvGroup: null });
  };

  renderContents = () => {
    if (this.state.expandedEnvGroup) {
      return (
        <ExpandedEnvGroup
          isAuthorized={this.props.isAuthorized}
          namespace={
            this.state.expandedEnvGroup?.namespace || this.state.namespace
          }
          currentCluster={this.props.currentCluster}
          envGroup={this.state.expandedEnvGroup}
          closeExpanded={() => this.closeExpanded()}
        />
      );
    } else {
      return (
        <>
          <DashboardHeader
            image={sliders}
            title="Environment Groups"
            description="Groups of environment variables for storing secrets and configuration."
            disableLineBreak
          />
          {this.renderBody()}
        </>
      );
    }
  };

  render() {
    return <>{this.renderContents()}</>;
  }
}

EnvGroupDashboard.contextType = Context;

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
