import Loading from "components/Loading";
import TabSelector from "components/TabSelector";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import ButtonEnablePREnvironments from "./components/ButtonEnablePREnvironments";
import { PreviewEnvironmentsHeader } from "./components/PreviewEnvironmentsHeader";
import DeploymentList from "./deployments/DeploymentList";
import EnvironmentsList from "./EnvironmentsList";

type TabEnum = "repositories" | "pull_requests";

const PreviewEnvironmentsHome = () => {
  const { currentCluster, currentProject } = useContext(Context);

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [currentTab, setCurrentTab] = useState<TabEnum>("repositories");

  useEffect(() => {
    let isSubscribed = true;
    api
      .listEnvironments(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      )
      .then(({ data }) => {
        if (isSubscribed) {
          setIsEnabled(true);
        }

        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        setIsEnabled(!!data.length);
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
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (hasError) {
    return <Placeholder>Something went wrong, please try again</Placeholder>;
  }

  if (!isEnabled) {
    return (
      <>
        <PreviewEnvironmentsHeader />
        <LineBreak />
        <Placeholder>
          <Title>Preview environments are not enabled on this cluster</Title>
          <Subtitle>
            In order to use preview environments, you must enable preview
            environments on this cluster.
          </Subtitle>
          <ButtonEnablePREnvironments />
        </Placeholder>
      </>
    );
  }

  return (
    <>
      <PreviewEnvironmentsHeader />
      <TabSelector
        options={[
          {
            label: "Linked Repositories",
            value: "repositories",
            component: <EnvironmentsList />,
          },
          {
            label: "Pull requests",
            value: "pull_requests",
            component: <DeploymentList />,
          },
        ]}
        currentTab={currentTab}
        setCurrentTab={(value: TabEnum) => setCurrentTab(value)}
      />
    </>
  );
};

export default PreviewEnvironmentsHome;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px 35px;
`;

const Placeholder = styled.div`
  padding: 30px;
  margin-top: 35px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: #ffffff11;
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const Title = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
  width: 50%;
`;

const Subtitle = styled.div`
  width: 50%;
`;
