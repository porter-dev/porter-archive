import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import { deployments, environments } from "../mocks";
import { Environment } from "../types";
import EnvironmentCard from "./EnvironmentCard";

const EnvironmentsList = () => {
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  useEffect(() => {
    let isSubscribed = true;
    api
      .listEnvironments<Environment[]>(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        setEnvironments(data);
      })

      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentCluster, currentProject]);

  if (isLoading) {
    return <Loading />;
  }

  const removeEnvironmentFromList = (deletedEnv: Environment) => {
    setEnvironments((prev) => {
      return prev.filter((env) => env.id === deletedEnv.id);
    });
  };

  return (
    <>
      <EnvironmentsGrid>
        {environments.map((env) => (
          <EnvironmentCard
            key={env.id}
            environment={env}
            onDelete={removeEnvironmentFromList}
          />
        ))}
      </EnvironmentsGrid>
    </>
  );
};

export default EnvironmentsList;

const mockRequest = () =>
  new Promise((res) => {
    setTimeout(() => {
      res({ data: environments });
    }, 1000);
  });

const EnvironmentsGrid = styled.div`
  margin-top: 32px;
  padding-bottom: 150px;
  display: grid;
  grid-row-gap: 25px;
`;
