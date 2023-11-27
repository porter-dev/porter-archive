import React, { useCallback, useEffect, useState } from "react";
import _ from "lodash";
import AnimateHeight, { type Height } from "react-animate-height";
import { type UseFieldArrayUpdate } from "react-hook-form";
import styled, { keyframes } from "styled-components";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import { type PorterAppVersionStatus } from "lib/hooks/useAppStatus";
import useResizeObserver from "lib/hooks/useResizeObserver";
import { type PorterAppFormData } from "lib/porter-apps";
import { type ClientService } from "lib/porter-apps/services";

import chip from "assets/computer-chip.svg";
import job from "assets/job.png";
import web from "assets/web.png";
import worker from "assets/worker.png";

import ServiceStatusFooter from "./ServiceStatusFooter";
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
  status?: PorterAppVersionStatus[];
  maxCPU: number;
  maxRAM: number;
  clusterContainsGPUNodes: boolean;
  internalNetworkingDetails: {
    namespace: string;
    appName: string;
  };
  clusterIngressIp: string;
  showDisableTls: boolean;
};

const ServiceContainer: React.FC<ServiceProps> = ({
  index,
  service,
  update,
  remove,
  status,
  maxCPU,
  maxRAM,
  clusterContainsGPUNodes,
  internalNetworkingDetails,
  clusterIngressIp,
  showDisableTls,
}) => {
  const [height, setHeight] = useState<Height>(service.expanded ? "auto" : 0);

  // onResize is called when the height of the service container changes
  // used to set the height of the AnimateHeight component on tab swtich
  const onResize = useCallback(
    (elt: HTMLDivElement) => {
      if (elt.clientHeight === 0) {
        return;
      }

      setHeight(elt.clientHeight ?? "auto");
    },
    [setHeight]
  );
  const ref = useResizeObserver(onResize);

  useEffect(() => {
    if (!service.expanded) {
      setHeight(0);
    }
  }, [service.expanded]);

  const renderTabs = (service: ClientService): JSX.Element => {
    return match(service)
      .with({ config: { type: "web" } }, (svc) => (
        <WebTabs
          index={index}
          service={svc}
          maxCPU={maxCPU}
          maxRAM={maxRAM}
          clusterContainsGPUNodes={clusterContainsGPUNodes}
          internalNetworkingDetails={internalNetworkingDetails}
          clusterIngressIp={clusterIngressIp}
          showDisableTls={showDisableTls}
        />
      ))
      .with({ config: { type: "worker" } }, (svc) => (
        <WorkerTabs
          index={index}
          service={svc}
          maxCPU={maxCPU}
          maxRAM={maxRAM}
          clusterContainsGPUNodes={clusterContainsGPUNodes}
        />
      ))
      .with({ config: { type: "job" } }, (svc) => (
        <JobTabs
          index={index}
          service={svc}
          maxCPU={maxCPU}
          maxRAM={maxRAM}
          clusterContainsGPUNodes={clusterContainsGPUNodes}
        />
      ))
      .with({ config: { type: "predeploy" } }, (svc) => (
        <JobTabs
          index={index}
          service={svc}
          maxCPU={maxCPU}
          maxRAM={maxRAM}
          clusterContainsGPUNodes={clusterContainsGPUNodes}
          isPredeploy
        />
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
          {service.gpu.enabled && (
            <>
              <Spacer inline x={1.5} />
              <TagContainer>
                <ChipIcon src={chip} alt="Chip Icon" />
                <TagText>GPU Workload</TagText>
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
      <AnimateHeight
        height={height}
        contentRef={ref}
        contentClassName="auto-content"
        duration={300}
      >
        {height !== 0 && (
          <StyledSourceBox
            showExpanded={service.expanded}
            hasFooter={status != null}
          >
            {renderTabs(service)}
          </StyledSourceBox>
        )}
      </AnimateHeight>
      {status && (
        <ServiceStatusFooter
          serviceName={service.name.value}
          isJob={service.config.type === "job"}
          status={status}
        />
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

const StyledSourceBox = styled.div<{
  showExpanded?: boolean;
  hasFooter?: boolean;
}>`
  width: 100%;
  color: #ffffff;
  padding: 14px 25px 30px;
  position: relative;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
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

const TagContainer = styled.div`
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
  animation: ${reflectiveGleam} 4s infinite linear;
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
