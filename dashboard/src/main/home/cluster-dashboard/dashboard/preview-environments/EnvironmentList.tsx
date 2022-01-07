import DynamicLink from "components/DynamicLink";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import { getQueryParam } from "shared/routing";
import styled from "styled-components";

import ButtonEnablePREnvironments from "./components/ButtonEnablePREnvironments";
import ConnectNewRepo from "./components/ConnectNewRepo";
import Loading from "components/Loading";

import _ from "lodash";
import EnvironmentCard from "./components/EnvironmentCard";

export type PRDeployment = {
  id: number;
  subdomain: string;
  status: string;
  environment_id: number;
  pull_request_id: number;
  namespace: string;
  gh_pr_name: string;
  gh_repo_owner: string;
  gh_repo_name: string;
  gh_commit_sha: string;
};

export type Environment = {
  id: Number;
  project_id: number;
  cluster_id: number;
  git_installation_id: number;
  name: string;
  git_repo_owner: string;
  git_repo_name: string;
};

const EnvironmentList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [environmentList, setEnvironmentList] = useState<Environment[]>([]);
  const [deploymentList, setDeploymentList] = useState<PRDeployment[]>([]);

  const [showConnectRepoFlow, setShowConnectRepoFlow] = useState(false);
  const { currentProject, currentCluster, setCurrentModal } = useContext(
    Context
  );

  const { url: currentUrl } = useRouteMatch();

  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    let isSubscribed = true;
    api
      .listEnvironments(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }
        setEnvironmentList(data);
      })
      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setHasError(true);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    api
      .getPRDeploymentList(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        setDeploymentList(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setHasError(true);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentCluster, currentProject]);

  useEffect(() => {
    const action = getQueryParam({ location }, "action");
    if (action === "connect-repo") {
      setShowConnectRepoFlow(true);
    } else {
      setShowConnectRepoFlow(false);
    }
  }, [location.search, history]);

  if (showConnectRepoFlow) {
    return (
      <Container>
        <ConnectNewRepo />
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  if (!environmentList.length) {
    return (
      <>
        <ButtonEnablePREnvironments />
      </>
    );
  }

  let renderDeploymentList = () => {
    if (!deploymentList.length) {
      return (
        <Placeholder>
          No preview apps have been found. Open a PR to create a new preview
          app.
        </Placeholder>
      );
    }

    return deploymentList.map((d) => {
      return <EnvironmentCard deployment={d} />;
    });
  };

  return (
    <Container>
      <ControlRow>
        <Button
          to={`${currentUrl}?selected_tab=preview_environments&action=connect-repo`}
          onClick={() => console.log("launch repo")}
        >
          <i className="material-icons">add</i> Add Repository
        </Button>
        <SettingsButton
          onClick={() => {
            setCurrentModal("PreviewEnvSettingsModal", {});
          }}
        >
          <i className="material-icons-outlined">settings</i>
          Configure
        </SettingsButton>
        {/* <Settings >
          <SettingsIcon src={settings} />
          <SettingsText>
            Configure
          </SettingsText>
        </Settings> */}
      </ControlRow>
      <EventsGrid>{renderDeploymentList()}</EventsGrid>
    </Container>
  );
};

export default EnvironmentList;

const SettingsButton = styled.div`
  font-size: 12px;
  padding: 8px 10px;
  margin-left: 10px;
  border-radius: 5px;
  color: white;
  display: flex;
  align-items: center;
  background: #ffffff08;
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 18px;
    margin-right: 8px;
  }
`;

const Placeholder = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  background: #26282f;
  border-radius: 5px;
  height: 370px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 13px;

  > i {
    font-size: 16px;
    margin-right: 12px;
  }
`;

const Container = styled.div`
  margin-top: 33px;
  padding-bottom: 120px;
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
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
  box-shadow: 0 5px 8px 0px #00000010;
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

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 20px;
  grid-template-columns: 1;
`;
