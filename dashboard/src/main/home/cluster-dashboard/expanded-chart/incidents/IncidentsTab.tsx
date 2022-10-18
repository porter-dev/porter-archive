import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import IncidentsTable from "./IncidentsTable";

export type DetectAgentResponse = {
  version: string;
};

const IncidentsTab = (props: {
  releaseName: string;
  namespace: string;
}): JSX.Element => {
  const { currentProject, currentCluster } = useContext(Context);
  const [isAgentInstalled, setIsAgentInstalled] = useState(false);
  const [isAgentOutdated, setIsAgentOutdated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .detectPorterAgent<DetectAgentResponse>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => res.data)
      .then((data) => {
        if (data.version === "v1") {
          setIsAgentInstalled(true);
          setIsAgentOutdated(true);
        } else {
          setIsAgentInstalled(true);
          setIsAgentOutdated(false);
        }
      })
      .catch(() => {
        setIsAgentInstalled(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const upgradeAgent = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;
    try {
      await api.upgradePorterAgent(
        "<token>",
        {},
        {
          project_id,
          cluster_id,
        }
      );
      setIsAgentOutdated(false);
    } catch (err) {
      setIsAgentOutdated(true);
    }
  };

  const installAgent = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    api
      .installPorterAgent("<token>", {}, { project_id, cluster_id })
      .then(() => {
        setIsAgentInstalled(true);
      })
      .catch(() => {
        setIsAgentInstalled(false);
      });
  };

  const triggerInstall = () => {
    if (isAgentOutdated) {
      upgradeAgent();
      return;
    }

    installAgent();
  };

  if (isLoading) {
    return (
      <StyledCard>
        <Loading height="200px" />
      </StyledCard>
    );
  }

  if (!isAgentInstalled || isAgentOutdated) {
    return (
      <Placeholder>
        <AgentButtonContainer>
          <Header>Incident detection is not enabled on this cluster.</Header>
          <Subheader>
            In order to view incidents, you must enable incident detection on
            this cluster.
          </Subheader>
          <InstallPorterAgentButton onClick={() => triggerInstall()}>
            <i className="material-icons">add</i> Enable Incident Detection
          </InstallPorterAgentButton>
        </AgentButtonContainer>
      </Placeholder>
    );
  }

  return (
    <StyledCard>
      <IncidentsTable {...props} />
    </StyledCard>
  );
};

export default IncidentsTab;

const StyledCard = styled.div`
  background: #26282f;
  padding: 14px;
  border-radius: 8px;
  box-shadow: 0 4px 15px 0px #00000055;
  position: relative;
  border: 2px solid #9eb4ff00;
  width: 100%;
  :not(:last-child) {
    margin-bottom: 25px;
  }
`;

const InstallPorterAgentButton = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  width: 200px;
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
  margin-top: 35px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: #ffffff11;
  border-radius: 8px;
  display: flex;
  align-items: left;
  justify-content: center;
  flex-direction: column;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const AgentButtonContainer = styled.div`
  display: flex;
  align-items: left;
  justify-content: center;
  flex-direction: column;
  width: 500px;
  margin: 0 auto;
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;

const Subheader = styled.div``;
