import DynamicLink from "components/DynamicLink";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import { getQueryParam } from "shared/routing";
import styled from "styled-components";
import Selector from "components/Selector";

import Loading from "components/Loading";

import _, { flatMapDepth } from "lodash";
import InfrastructureCard from "./components/InfrastructureCard";

export type Infrastructure = {
  id: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  kind: string;
  status: string;
  aws_integration_id: number;
  do_integration_id: number;
  gcp_integration_id: number;
  latest_operation: Operation;
};

export type Operation = {
  id: string;
  infra_id: number;
  type: string;
  status: string;
  errored: boolean;
  error: string;
  last_applied: any;
};

const EnvironmentList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [infraList, setInfraList] = useState<Infrastructure[]>([]);
  const { currentProject, currentCluster, setCurrentModal } = useContext(
    Context
  );

  const { url: currentUrl } = useRouteMatch();

  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    let isSubscribed = true;

    api
      .getInfra(
        "<token>",
        {},
        {
          project_id: currentProject.id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        console.log("HELLO THERE", data);

        setInfraList(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);

        if (isSubscribed) {
          setHasError(true);
        }

        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject]);

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

  let renderInfraList = () => {
    if (!infraList.length) {
      return (
        <Placeholder>
          No infrastructure has been found. Launch new infrastructure (TODO).
        </Placeholder>
      );
    }

    return infraList.map((infra) => {
      return <InfrastructureCard infra={infra} />;
    });
  };

  return (
    <Container>
      <EventsGrid>{renderInfraList()}</EventsGrid>
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
  overflow: visible;
  margin-top: 35px;
  padding-bottom: 150px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
  width: 50%;
`;

const Subheader = styled.div`
  width: 50%;
`;
