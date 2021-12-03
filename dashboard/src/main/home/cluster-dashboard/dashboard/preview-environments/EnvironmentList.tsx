import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router";
import { getQueryParam } from "shared/routing";
import styled from "styled-components";
import SortSelector from "../../SortSelector";
import ButtonEnablePREnvironments from "./components/ButtonEnablePREnvironments";
import ConnectNewRepo from "./components/ConnectNewRepo";

type Environment = {
  url: string;
  pr_link: string;
  status: string;
};

const mockData: Environment[] = [
  {
    url: "http://some-url",
    pr_link: "https://githubsuper",
    status: "some",
  },
  {
    url: "http://some-url",
    pr_link: "https://githubsuper",
    status: "some",
  },
  {
    url: "http://some-url",
    pr_link: "https://githubsuper",
    status: "some",
  },
  {
    url: "http://some-url",
    pr_link: "https://githubsuper",
    status: "some",
  },
];

const getMockData = () =>
  new Promise<{ data: Environment[] }>((resolve) => {
    setTimeout(() => {
      // resolve({ data: mockData });
      resolve({ data: [] });
    }, 2000);
  });

const EnvironmentList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [environmentList, setEnvironmentList] = useState<Environment[]>([]);
  const [showConnectRepoFlow, setShowConnectRepoFlow] = useState(false);

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
    <div>
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
      {environmentList.map((env) => {
        return (
          <div key={env.pr_link}>
            <span>{env.url}</span>
            <span>{env.pr_link}</span>
            <span>{env.status}</span>
          </div>
        );
      })}
    </div>
  );
};

export default EnvironmentList;

const ControlRow = styled.div`
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
