import React from "react";
import styled from "styled-components";

import Loading from "components/Loading";
import { useAppStatus } from "lib/hooks/useAppStatus";

import { valueExists } from "shared/util";

import { useLatestRevision } from "../LatestRevisionContext";
import ServiceStatus from "./status/ServiceStatus";

const StatusTab: React.FC = () => {
  const {
    projectId,
    clusterId,
    latestClientServices,
    deploymentTarget,
    appName,
  } = useLatestRevision();

  const { appServiceStatus } = useAppStatus({
    projectId,
    clusterId,
    serviceNames: latestClientServices
      .filter((s) => s.config.type === "web" || s.config.type === "worker")
      .map((s) => s.name.value),
    deploymentTargetId: deploymentTarget.id,
    appName,
  });

  const renderStatusSection = (): JSX.Element => {
    if (Object.keys(appServiceStatus).length === 0) {
      return (
        <NoControllers>
          <Loading />
        </NoControllers>
      );
    }

    return (
      <ServiceVersionContainer>
        {Object.keys(appServiceStatus)
          .sort()
          .map((serviceName) => {
            const serviceStatus = appServiceStatus[serviceName];
            const clientService = latestClientServices.find(
              (s) => s.name.value === serviceName
            );
            if (clientService) {
              return (
                <ServiceStatus
                  key={serviceName}
                  serviceStatus={serviceStatus}
                  service={clientService}
                />
              );
            }
            return null;
          })
          .filter(valueExists)}
      </ServiceVersionContainer>
    );
  };

  return <StyledStatusSection>{renderStatusSection()}</StyledStatusSection>;
};

export default StatusTab;

const StyledStatusSection = styled.div`
  padding: 0px;
  user-select: text;
  width: 100%;
  height: 100%;
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

const NoControllers = styled.div`
  padding-top: 20%;
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;

const ServiceVersionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
`;
