import DynamicLink from "components/DynamicLink";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import { getQueryParam } from "shared/routing";
import styled from "styled-components";
import Selector from "components/Selector";

import ButtonEnablePREnvironments from "./components/ButtonEnablePREnvironments";
import ConnectNewRepo from "./components/ConnectNewRepo";
import Loading from "components/Loading";

import _ from "lodash";
import EnvironmentCard from "./components/EnvironmentCard";

export type PRDeployment = {
  id: number;
  created_at: string;
  updated_at: string;
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
  const [statusSelectorVal, setStatusSelectorVal] = useState<string>("active");

  const [showConnectRepoFlow, setShowConnectRepoFlow] = useState(false);
  const { currentProject, currentCluster, setCurrentModal } = useContext(
    Context
  );

  const { url: currentUrl } = useRouteMatch();

  const location = useLocation();
  const history = useHistory();

  const getPRDeploymentList = () => {
    let status: string[] = [];

    if (statusSelectorVal == "active") {
      status = ["creating", "created", "failed"];
    } else if (statusSelectorVal == "inactive") {
      status = ["inactive"];
    }

    return api.getPRDeploymentList(
      "<token>",
      {
        status: status,
      },
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
      }
    );
  };

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
  }, [currentProject, currentCluster]);

  useEffect(() => {
    let isSubscribed = true;
    getPRDeploymentList()
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
  }, [currentCluster, currentProject, statusSelectorVal]);

  useEffect(() => {
    const action = getQueryParam({ location }, "action");
    if (action === "connect-repo") {
      setShowConnectRepoFlow(true);
    } else {
      setShowConnectRepoFlow(false);
    }
  }, [location.search, history]);

  const handleRefresh = () => {
    setIsLoading(true);
    getPRDeploymentList()
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }
        setEnvironmentList(data);
      })
      .catch((err) => {
        setHasError(true);
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  };

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

        <ActionsWrapper>
          <RefreshButton color={"#7d7d81"} onClick={handleRefresh}>
            <i className="material-icons">refresh</i>
          </RefreshButton>
          <StyledStatusSelector>
            <Selector
              activeValue={statusSelectorVal}
              setActiveValue={setStatusSelectorVal}
              options={[
                {
                  value: "active",
                  label: "Active",
                },
                {
                  value: "inactive",
                  label: "Inactive",
                },
              ]}
              dropdownLabel="Status"
              width="150px"
              dropdownWidth="230px"
              closeOverlay={true}
            />
          </StyledStatusSelector>

          <SettingsButton
            onClick={() => {
              setCurrentModal("PreviewEnvSettingsModal", {});
            }}
          >
            <i className="material-icons-outlined">settings</i>
            Configure
          </SettingsButton>
        </ActionsWrapper>
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

const ActionsWrapper = styled.div`
  display: flex;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props: { color: string }) => props.color};
  cursor: pointer;
  border: none;
  background: none;
  border-radius: 50%;
  margin-right: 10px;
  > i {
    font-size: 20px;
  }
  :hover {
    background-color: rgb(97 98 102 / 44%);
    color: white;
  }
`;

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

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledStatusSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
`;
