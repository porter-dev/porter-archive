import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
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
    // api
    //   .listEnvironments<Environment[]>(
    //     "<token>",
    //     {},
    //     {
    //       project_id: currentProject?.id,
    //       cluster_id: currentCluster?.id,
    //     }
    //   )
    mockRequest()
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

  return (
    <>
      {environments.map((env) => (
        <EnvironmentCard key={env.id} environment={env} />
      ))}
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
