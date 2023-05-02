import React from "react"
import AnimateHeight, { Height } from "react-animate-height";
import styled from "styled-components";

import web from "assets/web.png";
import worker from "assets/worker.png";
import job from "assets/job.png";

import Spacer from "components/porter/Spacer";
import WebTabs from "./WebTabs";
import WorkerTabs from "./WorkerTabs";
import JobTabs from "./JobTabs";
import { Service } from "./serviceTypes";

interface ServiceProps {
  service: Service;
  editService: (service: Service) => void;
  deleteService: () => void;
}

const ServiceContainer: React.FC<ServiceProps> = ({
  service,
  deleteService,
  editService,
}) => {
  const [showExpanded, setShowExpanded] = React.useState<boolean>(true)
  const [height, setHeight] = React.useState<Height>('auto');

  // TODO: calculate heights instead of hardcoding them
  const renderTabs = (service: Service) => {
    switch (service.type) {
      case 'web':
        return <WebTabs service={service} editService={editService} setHeight={setHeight} />
      case 'worker':
        return <WorkerTabs service={service} editService={editService} setHeight={setHeight} />
      case 'job':
        return <JobTabs service={service} editService={editService} setHeight={setHeight} />
    }
  }

  const renderIcon = (service: Service) => {
    switch (service.type) {
      case 'web':
        return <Icon src={web} />
      case 'worker':
        return <Icon src={worker} />
      case 'job':
        return <Icon src={job} />
    }
  }

  return (
    <>
      <ServiceHeader
        showExpanded={showExpanded}
        onClick={() => setShowExpanded(!showExpanded)}
      >
        <ServiceTitle>
          <ActionButton >
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          {renderIcon(service)}
          {service.name.trim().length > 0 ? service.name : "New Service"}
        </ServiceTitle>
        {service.canDelete && <ActionButton onClick={(e) => {
          deleteService();
        }}>
          <span className="material-icons">delete</span>
        </ActionButton>}
      </ServiceHeader>
      <AnimateHeight
        height={showExpanded ? height : 0}
      >
        <StyledSourceBox showExpanded={showExpanded}>
          {renderTabs(service)}
        </StyledSourceBox>
      </AnimateHeight>
      <Spacer y={0.5} />
    </>
  )
}

export default ServiceContainer;

const ServiceTitle = styled.div`
    display: flex;
    align-items: center;
`;

const StyledSourceBox = styled.div<{ showExpanded: boolean }>`
  width: 100%;
  color: #ffffff;
  padding: 14px 25px 30px;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  background: ${props => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
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

  :hover {
    color: white;
  }

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;

const ServiceHeader = styled.div`
  flex-direction: row;
  display: flex;
  height: 60px;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${props => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  border-bottom-left-radius: ${({ showExpanded }) => showExpanded && "0px"};
  border-bottom-right-radius: ${({ showExpanded }) => showExpanded && "0px"};

  .dropdown {
    font-size: 30px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -10px;
    transform: ${(props: { showExpanded: boolean }) => props.showExpanded ? "" : "rotate(-90deg)"};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Icon = styled.img`
  height: 18px;
  margin-right: 15px;

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;