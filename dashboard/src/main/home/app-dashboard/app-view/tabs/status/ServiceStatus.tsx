import React, { useState } from "react";
import styled from "styled-components";

import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import { type ClientServiceStatus } from "lib/hooks/useAppStatus";
import { type ClientService } from "lib/porter-apps/services";

import job from "assets/job.png";
import web from "assets/web.png";
import worker from "assets/worker.png";

import ServiceVersionStatus from "./ServiceVersionStatus";
import StatusTags from "./StatusTags";

type Props = {
  service: ClientService;
  serviceStatus: ClientServiceStatus;
};

const ServiceStatus: React.FC<Props> = ({ serviceStatus, service }) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const renderIcon = (service: ClientService): JSX.Element => {
    switch (service.config.type) {
      case "web":
        return <Icon src={web} />;
      case "worker":
        return <Icon src={worker} />;
      case "job":
        return <Icon src={job} />;
      case "predeploy":
        return <Icon src={job} />;
    }
  };

  return (
    <StyledResourceTab>
      <ServiceHeader
        showExpanded={expanded}
        onClick={() => {
          setExpanded(!expanded);
        }}
        bordersRounded={!expanded}
      >
        <ServiceTitle>
          <ActionButton>
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          {renderIcon(service)}
          <Spacer inline x={1} />
          {service.name.value}
        </ServiceTitle>

        <StatusTags
          statusList={serviceStatus.versionStatusList.flatMap(
            (v) => v.instanceStatusList
          )}
        />
      </ServiceHeader>
      {expanded && (
        <ExpandWrapper>
          {serviceStatus.versionStatusList.map((versionStatus) => {
            return (
              <ServiceVersionStatus
                key={versionStatus.revisionId}
                serviceVersionStatus={versionStatus}
                serviceName={service.name.value}
              />
            );
          })}
        </ExpandWrapper>
      )}
    </StyledResourceTab>
  );
};

export default ServiceStatus;

const StyledResourceTab = styled.div`
  width: 100%;
  margin-bottom: 2px;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
`;

const ExpandWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const Status = styled.div`
  display: flex;
  width; 20%;
  font-size: 12px;
  justify-content: flex-end;
  align-items: center;
  color: #aaaabb;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

export const StatusColor = styled.div<{ color: string }>`
  margin-left: 7px;
  width: 8px;
  min-width: 8px;
  height: 8px;
  background: ${({ color }) => color};
  border-radius: 20px;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;

const ServiceHeader = styled.div<{
  showExpanded?: boolean;
  bordersRounded?: boolean;
}>`
  flex-direction: row;
  display: flex;
  height: 60px;
  font-size: 18px;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  border-bottom: ${(props) =>
    props.showExpanded ? "none" : "1px solid #494b4f"};
  :hover {
    border: 1px solid #7a7b80;
    border-bottom: ${(props) =>
      props.showExpanded ? "none" : "1px solid #7a7b80"};
    ${ActionButton} {
      color: white;
    }
  }

  border-radius: 5px;
  border-bottom-left-radius: ${(props) => (props.bordersRounded ? "" : "0")};
  border-bottom-right-radius: ${(props) => (props.bordersRounded ? "" : "0")};

  .dropdown {
    font-size: 30px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -10px;
    transform: ${(props: { showExpanded?: boolean }) =>
      props.showExpanded ? "" : "rotate(-90deg)"};
  }
`;

const ServiceTitle = styled.div`
  display: flex;
  align-items: center;
`;
