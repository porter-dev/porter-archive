import React, { useContext, useEffect, useState } from "react";
import DynamicLink from "legacy/components/DynamicLink";
import Loading from "legacy/components/Loading";
import Placeholder from "legacy/components/Placeholder";
import api from "legacy/shared/api";
import styled from "styled-components";

import { Context } from "shared/Context";

import ButtonEnablePREnvironments from "../components/ButtonEnablePREnvironments";
import { PreviewEnvironmentsHeader } from "../components/PreviewEnvironmentsHeader";
import { type Environment } from "../types";
import EnvironmentCard from "./EnvironmentCard";

const EnvironmentsList = () => {
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [buttonIsReady, setButtonIsReady] = useState(false);

  const [environments, setEnvironments] = useState<Environment[]>([]);

  const removeEnvironmentFromList = (deletedEnv: Environment) => {
    setEnvironments((prev) => {
      return prev.filter((env) => env.id !== deletedEnv.id);
    });
  };

  const getEnvironments = async () => {
    try {
      const { data } = await api.listEnvironments(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      );

      return data;
    } catch (error) {
      throw error;
    }
  };

  const checkPreviewEnvironmentsEnabling = async (subscribeStauts: {
    subscribed: boolean;
  }) => {
    try {
      const envs = await getEnvironments();
      // const envs = await mockRequest();

      if (!subscribeStauts.subscribed) {
        return;
      }

      if (!Array.isArray(envs)) {
        return;
      }

      setEnvironments(envs);
    } catch (error) {
      setEnvironments([]);
    }
  };

  useEffect(() => {
    const subscribedStatus = { subscribed: true };

    setIsLoading(true);

    checkPreviewEnvironmentsEnabling(subscribedStatus).finally(() => {
      if (subscribedStatus.subscribed) {
        setIsLoading(false);
      }
    });

    return () => {
      subscribedStatus.subscribed = false;
    };
  }, [currentCluster, currentProject]);

  return (
    <>
      <PreviewEnvironmentsHeader />
      <Relative>
        <ControlRow>
          <ButtonEnablePREnvironments setIsReady={setButtonIsReady} />
        </ControlRow>
        {isLoading ? (
          <LoadingWrapper>
            <Loading />
          </LoadingWrapper>
        ) : (
          <>
            {environments.length === 0 ? (
              <Placeholder
                title="No repositories found"
                height="calc(100vh - 400px)"
              >
                No repositories were found with Preview Environments enabled.
              </Placeholder>
            ) : (
              <EnvironmentsGrid>
                {environments.map((env) => (
                  <EnvironmentCard
                    key={env.id}
                    environment={env}
                    onDelete={removeEnvironmentFromList}
                  />
                ))}
              </EnvironmentsGrid>
            )}
          </>
        )}
      </Relative>
    </>
  );
};

export default EnvironmentsList;

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const Relative = styled.div`
  position: relative;
`;

const EnvironmentsGrid = styled.div`
  padding-bottom: 150px;
  display: grid;
  grid-row-gap: 15px;
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-left: 0px;
`;

const Button = styled(DynamicLink)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
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
