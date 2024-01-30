import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import envGroupGrad from "assets/env-group-grad.svg";

import { Context } from "shared/Context";
import api from "shared/api";

import { type ClusterType } from "shared/types";

import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
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
import Button from "components/porter/Button";
import Select from "components/porter/Select";
import Container from "components/porter/Container";
import Image from "components/porter/Image";

import sort from "assets/sort.svg";
import Link from "components/porter/Link";

type Props = RouteComponentProps & WithAuthProps;

const EnvDashboard: React.FC<Props> = (props) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [envGroups, setEnvGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const updateEnvGroups = async (): Promise<void> => {
    try {
      const res = await api.getAllEnvGroups(
        "<token>",
        {},
        {
          id: currentProject?.id ?? -1,
          cluster_id: currentCluster?.id ?? -1,
        }
      );
      setEnvGroups(res.data.environment_groups);
      setIsLoading(false);
    } catch (err) {
      setHasError(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    void updateEnvGroups();
  }, [currentProject, currentCluster]);

  const renderContents = (): React.ReactNode => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />
    }

    const isAuthorizedToAdd = props.isAuthorized("env_group", "", [
      "get",
      "create",
    ]);

    return (
      <>
        {isLoading ? (
          <LoadingWrapper>
            <Loading />
          </LoadingWrapper>
        ) : (
          envGroups && envGroups.length > 0 ? (
            <>
              <Container row style={{ justifyContent: "space-between" }}>
                {isAuthorizedToAdd && (
                  <Link to={`/envs/new`}>
                    <Button
                      height="30px"
                    >
                      <I className="material-icons">add</I> New env group
                    </Button>
                  </Link>
                )}
              </Container>
              <Spacer y={1} />
              <EnvGroupList
                envGroups={envGroups}
              />
            </>
          ) : (
            <DashboardPlaceholder>
              <Text size={16}>No environment groups found</Text>
              <Spacer y={0.5} />
              <Text color={"helper"}>Get started by creating an environment group.</Text>
              <Spacer y={1} />
              <Link to={`/envs/new`}>
                <Button
                  height="35px"
                  alt
                >
                  Create a new env group <Spacer inline x={1} />{" "}
                  <i className="material-icons" style={{ fontSize: "18px" }}>
                    east
                  </i>
                </Button>
              </Link>
            </DashboardPlaceholder>
          )
        )}
      </>
    );
  };

  return (
    <DashboardWrapper>
      <DashboardHeader
        image={envGroupGrad}
        title="Environment groups"
        description="Groups of environment variables for storing secrets and configuration."
        disableLineBreak
        capitalize={false}
      />
      {renderContents()}
    </DashboardWrapper>
  );
};

export default withRouter(withAuth(EnvDashboard));

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const DashboardWrapper = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;