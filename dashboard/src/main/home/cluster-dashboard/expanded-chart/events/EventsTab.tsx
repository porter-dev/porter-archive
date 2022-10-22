import React, { useEffect, useContext, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import EventList from "./EventList";
import Loading from "components/Loading";
import InfiniteScroll from "react-infinite-scroll-component";
import { Context } from "shared/Context";
import Dropdown from "components/Dropdown";
import { InitLogData } from "../logs-section/LogsSection";

type Props = {
  currentChart: any;
  setLogData?: (logData: InitLogData) => void;
  overridingJobName?: string;
};

const EventsTab: React.FC<Props> = ({
  currentChart,
  setLogData,
  overridingJobName,
}) => {
  const [hasPorterAgent, setHasPorterAgent] = useState(true);
  const { currentProject, currentCluster } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    // determine if the agent is installed properly - if not, render upgrade screen
    api
      .detectPorterAgent("<token>", {}, { project_id, cluster_id })
      .then((res) => {
        console.log(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setHasPorterAgent(false);
          setIsLoading(false);
        }
      });
  }, []);

  const installAgent = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    api
      .installPorterAgent("<token>", {}, { project_id, cluster_id })
      .then(() => {
        setHasPorterAgent(true);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const triggerInstall = () => {
    installAgent();
  };

  const getFilters = () => {
    if (overridingJobName) {
      return {
        release_name: currentChart.name,
        release_namespace: currentChart.namespace,
        job_name: overridingJobName,
      };
    }

    return {
      release_name: currentChart.name,
      release_namespace: currentChart.namespace,
    };
  };

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (!hasPorterAgent) {
    return (
      <Placeholder>
        <div>
          <Header>We couldn't detect the Porter agent on your cluster</Header>
          In order to use the events tab, you need to install the Porter agent.
          <InstallPorterAgentButton onClick={() => triggerInstall()}>
            <i className="material-icons">add</i> Install Porter agent
          </InstallPorterAgentButton>
        </div>
      </Placeholder>
    );
  }

  return (
    <EventsPageWrapper>
      <EventList setLogData={setLogData} filters={getFilters()} />
    </EventsPageWrapper>
  );
};

export default EventsTab;

const Label = styled.div`
  color: #ffffff44;
  margin-right: 8px;
  font-size: 13px;
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding-left: 0px;
  font-size: 13px;
`;

const EventsPageWrapper = styled.div`
  font-size: 13px;
  border-radius: 8px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const InstallPorterAgentButton = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border: none;
  border-radius: 5px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-top: 20px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#5561C0"};
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
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

const Placeholder = styled.div`
  padding: 30px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: #ffffff08;
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;
