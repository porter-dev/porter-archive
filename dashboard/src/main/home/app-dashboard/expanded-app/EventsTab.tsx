import React, { useEffect, useContext, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import EventList from "./EventList";
import Loading from "components/Loading";
import { Context } from "shared/Context";
import Fieldset from "components/porter/Fieldset";
import Button from "components/porter/Button";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";

type Props = {
  currentChart: any;
};

const EventsTab: React.FC<Props> = ({ currentChart }) => {
  const [hasPorterAgent, setHasPorterAgent] = useState(true);
  const [isPorterAgentInstalling, setIsPorterAgentInstalling] = useState(false);
  const { currentProject, currentCluster } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // determine if the agent is installed properly - if not, start by render upgrade screen
    checkForAgent();
  }, []);

  useEffect(() => {
    if (!isPorterAgentInstalling) {
      return;
    }

    const checkForAgentInterval = setInterval(checkForAgent, 3000);

    return () => clearInterval(checkForAgentInterval);
  }, [isPorterAgentInstalling]);

  const checkForAgent = () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    api
      .detectPorterAgent("<token>", {}, { project_id, cluster_id })
      .then((res) => {
        if (res.data?.version != "v3") {
          setHasPorterAgent(false);
        } else {
          // next, check whether events can be queried - if they can, we're good to go
          let filters: any = getFilters();

          let apiQuery = api.listPorterEvents;

          if (filters.job_name) {
            apiQuery = api.listPorterJobEvents;
          }

          apiQuery("<token>", filters, {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
          })
            .then((res) => {
              setHasPorterAgent(true);
              setIsPorterAgentInstalling(false);
            })
            .catch((err) => {
              // do nothing - this is expected while installing
            });
        }

        setIsLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setHasPorterAgent(false);
          setIsLoading(false);
        }
      });
  };

  const installAgent = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    setIsPorterAgentInstalling(true);

    api
      .installPorterAgent("<token>", {}, { project_id, cluster_id })
      .then()
      .catch((err) => {
        setIsPorterAgentInstalling(false);
        console.log(err);
      });
  };

  const triggerInstall = () => {
    installAgent();
  };

  const getFilters = () => {
    return {
      release_name: currentChart.name,
      release_namespace: currentChart.namespace,
    };
  };

  if (isPorterAgentInstalling) {
    return (
      <Placeholder>
        <Header>Installing agent...</Header>
      </Placeholder>
    );
  }

  if (isLoading) {
    return (
      <Fieldset>
        <Loading />
      </Fieldset>
    );
  }

  if (!hasPorterAgent) {
    return (
      <Fieldset>
        <Text size={16}>We couldn't detect the Porter agent on your cluster</Text>
        <Spacer y={0.5} />
        <Text color="helper">In order to use the Events tab, you need to install the Porter agent.</Text>
        <Spacer y={1} />
        <Button onClick={() => triggerInstall()}>
          <I className="material-icons">add</I> Install Porter agent
        </Button>
      </Fieldset>
    );
  }

  return (
    <EventsPageWrapper>
      <EventList namespace={currentChart.namespace} filters={getFilters()} />
    </EventsPageWrapper>
  );
};

export default EventsTab;

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

const I = styled.i`
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;
