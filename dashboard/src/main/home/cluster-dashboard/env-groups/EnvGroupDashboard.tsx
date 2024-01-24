import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import sliders from "assets/env-groups.svg";

import { Context } from "shared/Context";
import api from "shared/api";

import { type ClusterType } from "shared/types";

import DashboardHeader from "../DashboardHeader";
import { NamespaceSelector } from "../NamespaceSelector";
import SortSelector from "../SortSelector";
import EnvGroupList from "./EnvGroupList";
import CreateEnvGroup from "./CreateEnvGroup";
import ExpandedEnvGroup from "./ExpandedEnvGroup";
import { withRouter, type RouteComponentProps } from "react-router";
import { getQueryParam, pushQueryParams } from "shared/routing";
import { withAuth, type WithAuthProps } from "shared/auth/AuthorizationHoc";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Spacer from "components/porter/Spacer";
import Loading from "components/Loading";
import Placeholder from "components/Placeholder";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Text from "components/porter/Text";
import Link from "components/porter/Link";
import Button from "components/porter/Button";

type Props = RouteComponentProps & WithAuthProps;

const EnvGroupDashboard: React.FC<Props> = (props) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [expand, setExpand] = useState<boolean>(false);
  const [update, setUpdate] = useState<any[]>([]);
  const [namespace, setNamespace] = useState<string>("");
  const [expandedEnvGroup, setExpandedEnvGroup] = useState<any>(null);
  const [createEnvMode, setCreateEnvMode] = useState<boolean>(false);
  const [sortType, setSortType] = useState<string>(
    localStorage.getItem("SortType") || "Newest"
  );
  const [envGroups, setEnvGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  
  useEffect(() => {
    pushQueryParams(props, {
      namespace: currentProject?.simplified_view_enabled ? ("porter-env-group") : (namespace ?? "ALL"),
    })
  }, [namespace]);

  const closeExpanded = (): void => {
    pushQueryParams(props, {}, ["selected_env_group"]);
    const redirectUrlOnClose = getQueryParam(props, "redirect_url");
    if (redirectUrlOnClose) {
      props.history.push(redirectUrlOnClose);
      return;
    }
    setExpandedEnvGroup(null);
  };

  const updateEnvGroups = async () => {
    try {
      let envGroups: any[] = []
      if (currentProject?.simplified_view_enabled) {
        envGroups = await api
          .getAllEnvGroups(
            "<token>",
            {},
            {
              id: currentProject.id,
              cluster_id: currentCluster?.id || -1,
            }
          )
          .then((res: any) => {
            return res.data?.environment_groups;
          });
      } else {
        envGroups = await api.listEnvGroups(
          "<token>",
          {},
          {
            id: currentProject?.id || -1,
            namespace,
            cluster_id: currentCluster?.id || -1,
          }
        )
        .then((res) => {
          return res.data;
        });
      }
      const sortedGroups = envGroups;
      if (sortedGroups) {
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
  }, [currentCluster, namespace, sortType, createEnvMode]);

  const renderBody = (): React.ReactNode => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />
    }

    const goBack = (): void => {
      setCreateEnvMode(false);
    };

    if (createEnvMode) {
      return (
        <CreateEnvGroup 
          goBack={goBack}
          currentCluster={currentCluster as ClusterType}
        />
      );
    } else {
      const isAuthorizedToAdd = props.isAuthorized("env_group", "", [
        "get",
        "create",
      ]);

      return (
        <>
          {isLoading || (!namespace && namespace !== "") ? (
            <LoadingWrapper>
              <Loading />
            </LoadingWrapper>
          ) : (
            hasError ? (
              <Placeholder height="370px">
                <i className="material-icons">error</i> Error connecting to cluster.
              </Placeholder>
            ) : (
              !envGroups || envGroups.length === 0 ? (
                <DashboardPlaceholder>
                  <Text size={16}>No environment groups found</Text>
                  <Spacer y={0.5} />
                  <Text color={"helper"}>Get started by creating an environment group.</Text>
                  <Spacer y={1} />
                  <Button
                    height="35px"
                    alt
                    onClick={() => {
                      setCreateEnvMode(!createEnvMode);
                    }}
                  >
                    Create environment group <Spacer inline x={1} />{" "}
                    <i className="material-icons" style={{ fontSize: "18px" }}>
                      east
                    </i>
                  </Button>
                </DashboardPlaceholder>
              ) : (
                <>
                  <ControlRow hasMultipleChilds={isAuthorizedToAdd}>
                    <SortFilterWrapper>
                      <SortSelector
                        currentView="env-groups"
                        setSortType={setSortType}
                        sortType={sortType}
                      />
                      <Spacer inline width="10px" />
                      {!currentProject?.simplified_view_enabled && <NamespaceSelector
                        setNamespace={setNamespace}
                        namespace={currentProject?.simplified_view_enabled ? "porter-env-group" : namespace}
                      />}
                    </SortFilterWrapper>
                    <Flex>
                      {isAuthorizedToAdd && (
                        <Button onClick={() => {
                          setCreateEnvMode(!createEnvMode);
                        }}>
                          <i className="material-icons">add</i> Create env group
                        </Button>
                      )}
                    </Flex>
                  </ControlRow>
                  <EnvGroupList
                    envGroups={envGroups}
                    currentCluster={currentCluster as ClusterType}
                    namespace={currentProject?.simplified_view_enabled ? "porter-env-group" : namespace}
                    sortType={sortType}
                    setExpandedEnvGroup={setExpandedEnvGroup}
                  />
                </>
              )
            )
          )}
        </>
      );
    }
  };

  const renderContents = (): React.ReactNode => {
    if (expandedEnvGroup) {
      return (
        <ExpandedEnvGroup
          isAuthorized={props.isAuthorized}
          namespace={currentProject?.simplified_view_enabled ? "porter-env-group" : (expandedEnvGroup?.namespace || namespace)}
          currentCluster={currentCluster as ClusterType}
          envGroup={expandedEnvGroup}
          closeExpanded={closeExpanded}
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

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

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