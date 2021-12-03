import DynamicLink from "components/DynamicLink";
import React, { useEffect, useState } from "react";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import { getQueryParam } from "shared/routing";
import styled from "styled-components";
import SortSelector from "../../SortSelector";
import ButtonEnablePREnvironments from "./components/ButtonEnablePREnvironments";
import ConnectNewRepo from "./components/ConnectNewRepo";
import pr_icon from "assets/pull_request_icon.svg";

type Environment = {
  id: number;
  url: string;
  pr_link: string;
  status: string;
};

const mockData: Environment[] = [
  {
    id: 1,
    url: "http://some-url",
    pr_link: "https://githubsuper",
    status: "some",
  },
  {
    id: 2,
    url: "http://some-url",
    pr_link: "https://githubsuper",
    status: "some",
  },
  {
    id: 3,
    url: "http://some-url",
    pr_link: "https://githubsuper",
    status: "some",
  },
  {
    id: 4,
    url: "http://some-url",
    pr_link: "https://githubsuper",
    status: "some",
  },
];

const getMockData = () =>
  new Promise<{ data: Environment[] }>((resolve) => {
    setTimeout(() => {
      resolve({ data: mockData });
      // resolve({ data: [] });
    }, 2000);
  });

const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
};

const EnvironmentList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [environmentList, setEnvironmentList] = useState<Environment[]>([]);
  const [showConnectRepoFlow, setShowConnectRepoFlow] = useState(false);

  const { url: currentUrl } = useRouteMatch();

  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    let isSubscribed = true;

    // TODO: Replace get mock data by endpoint
    getMockData()
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
          setEnvironmentList([]);
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
    console.log("HERE", action, location);
    if (action === "connect-repo") {
      setShowConnectRepoFlow(true);
    } else {
      setShowConnectRepoFlow(false);
    }
  }, [location.search, history]);

  if (showConnectRepoFlow) {
    return <ConnectNewRepo />;
  }

  if (isLoading) {
    return <>Loading . . .</>;
  }

  if (hasError) {
    return <>Unexpected error occured, please try again later</>;
  }

  if (!environmentList.length) {
    return (
      <>
        <ButtonEnablePREnvironments />
      </>
    );
  }

  return (
    <>
      <ControlRow>
        <Button onClick={() => console.log("launch repo")}>
          <i className="material-icons">add</i> Add repository
        </Button>
        <SortFilterWrapper>
          {/* <SortSelector
            setSortType={(sortType) => this.setState({ sortType })}
            sortType={this.state.sortType}
          /> */}
        </SortFilterWrapper>
      </ControlRow>
      <EventsGrid>
        {environmentList.map((env) => {
          return (
            <EnvironmentCard
              to={`${currentUrl}/pr-env-detail/${env.id}`}
              key={env.pr_link}
            >
              <DataAndIconContainer>
                <PRIcon src={pr_icon} alt="pull request icon" />
                <DataContainer>
                  <DataPRUrl>URL: {env.url}</DataPRUrl>
                  <DataPRLink>PR Link: {env.pr_link}</DataPRLink>
                </DataContainer>
              </DataAndIconContainer>
              <StatusContainer>
                <Status>
                  <StatusDot status="deployed" />
                  {capitalize(env.status)}
                </Status>
              </StatusContainer>
            </EnvironmentCard>
          );
        })}
      </EventsGrid>
    </>
  );
};

export default EnvironmentList;

const ControlRow = styled.div`
  margin-top: 30px;
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const Button = styled.div`
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

const EnvironmentCard = styled(DynamicLink)`
  background: #26282f;
  min-height: 90px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #26282f;
  box-shadow: 0 4px 15px 0px #00000055;
  border-radius: 8px;
  padding: 20px;

  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  :hover {
    transform: scale(1.025);
    box-shadow: 0 8px 20px 0px #00000030;
    cursor: pointer;
  }
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
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
  width: 25px;
  margin-right: 10px;
`;

const DataAndIconContainer = styled.div`
  display: flex;
  height: 100%;
`;

const DataPRLink = styled.span`
  font-size: 14px;
  color: #a7a6bb;
`;

const Status = styled.span`
  font-size: 14px;
  display: flex;
  align-items: center;
  min-height: 17px;
  color: #a7a6bb;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "deployed"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 5px;
`;
