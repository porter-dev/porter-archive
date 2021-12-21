import DynamicLink from "components/DynamicLink";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import { getQueryParam } from "shared/routing";
import styled from "styled-components";
import { integrationList } from "shared/common";
import ButtonEnablePREnvironments from "./components/ButtonEnablePREnvironments";
import ConnectNewRepo from "./components/ConnectNewRepo";
import Loading from "components/Loading";
import pr_icon from "assets/pull_request_icon.svg";

export type PRDeployment = {
  id: number,
  subdomain: string,
  status: string,
  environment_id: number,
  pull_request_id: number,
  namespace: string,
  gh_pr_name: string,
  gh_repo_owner: string,
  gh_repo_name: string,
  gh_commit_sha: string,
}

export type Environment = {
  id: Number,
  project_id: number,
  cluster_id: number,
  git_installation_id: number,
  name: string,
  git_repo_owner: string,
  git_repo_name: string,
}

export const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
};

const EnvironmentList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [environmentList, setEnvironmentList] = useState<Environment[]>([]);
  const [deploymentList, setDeploymentList] = useState<PRDeployment[]>([]);
  const [showRepoTooltip, setShowRepoTooltip] = useState(false);
  const [showConnectRepoFlow, setShowConnectRepoFlow] = useState(false);
  const { currentProject, currentCluster, setCurrentError } = useContext(
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
      ).then(({ data }) => {
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
        })
  
        return () => {
          isSubscribed = false;
        };  
    }, []);

  useEffect(() => {
    let isSubscribed = true;
    // TODO: Replace get mock data by endpoint
    api
    .getPRDeploymentList(
      "<token>",
      {},
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
      }
    ).then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        setDeploymentList(data);
      })
      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setHasError(true);
          setDeploymentList([]);
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
  }, []);

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
    return(
      <Placeholder>
       Error
      </Placeholder>
    )
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
          No preview apps have been found. Open a PR to create a new preview app.
        </Placeholder>
      );
    }

    return deploymentList.map((d) => {
      let repository = `${d.gh_repo_owner}/${d.gh_repo_name}`
      return (
        <EnvironmentCard key={d.id}>
          <DataContainer>
            <PRName>
              <PRIcon src={pr_icon} alt="pull request icon" />
              {d.gh_pr_name}
            </PRName>

            <PRWrapper>
            <StatusContainer>
              <Status>
                <StatusDot status={d.status} />
                {capitalize(d.status)}
              </Status>
            </StatusContainer>
            <DeploymentImageContainer>
              <DeploymentTypeIcon src={integrationList.repo.icon} />
              <RepositoryName
                onMouseOver={() => {
                  setShowRepoTooltip(true);
                }}
                onMouseOut={() => {
                  setShowRepoTooltip(false);
                }}
              >
                {repository}
              </RepositoryName>
              {showRepoTooltip && <Tooltip>{repository}</Tooltip>}
            </DeploymentImageContainer>
            </PRWrapper>


          </DataContainer>
          <Flex>
            <RowButton
              to={`${currentUrl}/pr-env-detail/${d.namespace}`}
              key={d.id}
            >
              <i className="material-icons-outlined">info</i>
              Details
            </RowButton>
            <RowButton 
              to={d.subdomain} 
              key={d.subdomain}
              target="_blank"
            >
              <i className="material-icons">open_in_new</i>
              View Live
            </RowButton>
          </Flex>
        </EnvironmentCard>
      );
    }) 
  }

  return (
    <Container>
      <ControlRow>
        <Button
          to={`${currentUrl}?selected_tab=preview_environments&action=connect-repo`}
          onClick={() => console.log("launch repo")}
        >
          <i className="material-icons">add</i> Add Repository
        </Button>
        <SortFilterWrapper>
          {/* <SortSelector
            setSortType={(sortType) => this.setState({ sortType })}
            sortType={this.state.sortType}
          /> */}
        </SortFilterWrapper>
      </ControlRow>
      <EventsGrid>
        {renderDeploymentList()}
      </EventsGrid>
    </Container>
  );
};

export default EnvironmentList;
const PRWrapper = styled.div`
  display: flex;
  align-items: center;
`

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
const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const Helper = styled.span`
  text-transform: capitalize;
  color: #ffffff44;
  margin-right: 5px;
`;

const PRName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
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

const SortFilterWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  > div:not(:first-child) {
    margin-left: 30px;
  }
`;

const EnvironmentCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ffffff44;
  background: #ffffff08;
  margin-bottom: 5px;
  border-radius: 10px;
  padding: 14px;
  overflow: hidden;
  height: 80px;
  font-size: 13px;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 20px;
  grid-template-columns: 1;
`;

const DataContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const StatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
`;

const DataPRUrl = styled.span`
  font-size: 16px;
  display: flex;
  align-items: center;
`;

const PRIcon = styled.img`
  font-size: 20px;
  height: 17px;
  margin-right: 10px;
  color: #aaaabb;
  opacity: 50%;
`;

const RowButton = styled(DynamicLink)`
  font-size: 12px;
  padding: 8px 10px;
  margin-left: 10px;
  border-radius: 5px;
  color: #ffffff;
  border: 1px solid #aaaabb;
  display: flex;
  align-items: center;
  background: #ffffff08;
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }

  > i {
    font-size: 14px;
    margin-right: 8px;
  }
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  min-height: 17px;
  color: #a7a6bb;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  margin-right: 15px;
  background: ${(props: { status: string }) =>
    props.status === "created"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
`;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  margin-left: 15px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  padding-left: 5px;
`;

const Icon = styled.img`
  width: 100%;
`;

const DeploymentTypeIcon = styled(Icon)`
  width: 20px;
  margin-right: 10px;
`;

const RepositoryName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 390px;
  position: relative;
  margin-right: 3px;
`;

const Tooltip = styled.div`
  position: absolute;
  left: -20px;
  top: 10px;
  min-height: 18px;
  max-width: calc(700px);
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  color: white;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;