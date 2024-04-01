import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import { type UseFieldArrayUpdate } from "react-hook-form";
import styled, { keyframes } from "styled-components";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import { type ClientServiceStatus } from "lib/hooks/useAppStatus";
import { type PorterAppFormData } from "lib/porter-apps";
import {
  isClientJobService,
  type ClientService,
} from "lib/porter-apps/services";

import chip from "assets/computer-chip.svg";
import job from "assets/job.png";
import moon from "assets/moon.svg";
import web from "assets/web.png";
import worker from "assets/worker.png";

import JobFooter from "./footers/JobFooter";
import ServiceStatusFooter from "./footers/ServiceStatusFooter";
import JobTabs from "./tabs/JobTabs";
import WebTabs from "./tabs/WebTabs";
import WorkerTabs from "./tabs/WorkerTabs";

type ServiceProps = {
  index: number;
  service: ClientService;
  update: UseFieldArrayUpdate<
    PorterAppFormData,
    "app.services" | "app.predeploy"
  >;
  remove: (index: number) => void;
  status?: ClientServiceStatus[];
  internalNetworkingDetails: {
    namespace: string;
    appName: string;
  };
  existingServiceNames: string[];
};

const ServiceContainer: React.FC<ServiceProps> = ({
  index,
  service,
  update,
  remove,
  status,
  internalNetworkingDetails,
  existingServiceNames,
}) => {
  const renderTabs = (service: ClientService): JSX.Element => {
    return match(service)
      .with({ config: { type: "web" } }, (svc) => (
        <WebTabs
          index={index}
          service={svc}
          internalNetworkingDetails={internalNetworkingDetails}
        />
      ))
      .with({ config: { type: "worker" } }, (svc) => (
        <WorkerTabs index={index} service={svc} />
      ))
      .with({ config: { type: "job" } }, (svc) => (
        <JobTabs index={index} service={svc} />
      ))
      .with({ config: { type: "predeploy" } }, (svc) => (
        <JobTabs index={index} service={svc} isPredeploy />
      ))
      .exhaustive();
  };

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
    <>
      <ServiceHeader
        showExpanded={service.expanded}
        onClick={() => {
          update(index, {
            ...service,
            expanded: !service.expanded,
          });
        }}
        bordersRounded={!status && !service.expanded}
      >
        <ServiceTitle>
          <ActionButton>
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          {renderIcon(service)}
          {service.name.value.trim().length > 0
            ? service.name.value
            : "New Service"}
          {service.gpu?.enabled.value && (
            <>
              <Spacer inline x={1.5} />
              <TagContainer>
                <ChipIcon src={chip} alt="Chip Icon" />
                <TagText>GPU Workload</TagText>
              </TagContainer>
            </>
          )}
          {service.sleep?.value && (
            <>
              <Spacer inline x={1.5} />
              <TagContainer disableAnimation>
                <ChipIcon src={moon} alt="Moon" />
                <TagText>Sleeping</TagText>
              </TagContainer>
            </>
          )}
        </ServiceTitle>

        {service.canDelete && (
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              remove(index);
            }}
          >
            <span className="material-icons">delete</span>
          </ActionButton>
        )}
      </ServiceHeader>
      <AnimatePresence>
        {service.expanded && (
          <StyledSourceBox
            key={service.name.value}
            initial={{
              height: 0,
            }}
            animate={{
              height: "auto",
              transition: {
                duration: 0.3,
              },
            }}
            exit={{
              height: 0,
              transition: {
                duration: 0.3,
              },
            }}
            showExpanded={service.expanded}
            hasFooter={status != null}
          >
            <div
              style={{
                padding: "14px 25px 30px",
                border: "1px solid #494b4f",
              }}
            >
              {renderTabs(service)}
            </div>
          </StyledSourceBox>
        )}
      </AnimatePresence>
      {!isClientJobService(service) && status && (
        <ServiceStatusFooter status={status} name={service.name.value} />
      )}
      {isClientJobService(service) &&
        // make sure that this service is in a created revision before showing the job footer - cannot view history / run jobs that are not deployed
        existingServiceNames.includes(service.name.value) && (
          <JobFooter jobName={service.name.value} />
        )}
      <Spacer y={0.5} />
    </>
  );
};

export default ServiceContainer;

const ServiceTitle = styled.div`
  display: flex;
  align-items: center;
`;

const StyledSourceBox = styled(motion.div)<{
  showExpanded?: boolean;
  hasFooter?: boolean;
}>`
  overflow: hidden;
  color: #ffffff;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border-top: 0;
  border-bottom-left-radius: ${(props) => (props.hasFooter ? "0" : "5px")};
  border-bottom-right-radius: ${(props) => (props.hasFooter ? "0" : "5px")};
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

const ServiceHeader = styled.div<{
  showExpanded?: boolean;
  bordersRounded?: boolean;
}>`
  flex-direction: row;
  display: flex;
  height: 60px;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  transition: all 0.2s;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

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

const Icon = styled.img`
  height: 18px;
  margin-right: 15px;
`;

const reflectiveGleam = keyframes`
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
`;

const TagContainer = styled.div<{
  disableAnimation?: boolean;
}>`
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 8px;
  position: relative;
  width: auto;
  height: 30px;
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.05) 75%
  );
  background-size: 200% 200%;
  border-radius: 10px;
  animation: ${reflectiveGleam} ${(props) =>
    props.disableAnimation ? "" : "4s infinite"}
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ChipIcon = styled.img`
  width: 14px;
  height: 14px;
  margin-right: 4px;
`;

const TagText = styled.span`
  font-family: "General Sans";
  font-weight: 400;
  font-size: 10px;
  line-height: 100%;
  letter-spacing: -0.02em;
  color: #ffffff;
`;
