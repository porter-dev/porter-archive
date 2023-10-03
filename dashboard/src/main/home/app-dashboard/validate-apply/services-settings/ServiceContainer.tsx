import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import AnimateHeight, { Height } from "react-animate-height";
import styled from "styled-components";
import _ from "lodash";
import convert from "convert";

import web from "assets/web.png";
import worker from "assets/worker.png";
import job from "assets/job.png";

import Spacer from "components/porter/Spacer";
import WebTabs from "./tabs/WebTabs";
import WorkerTabs from "./tabs/WorkerTabs";
import JobTabs from "./tabs/JobTabs";
import { Context } from "shared/Context";
import { AWS_INSTANCE_LIMITS } from "./tabs/utils";
import api from "shared/api";
import StatusFooter from "../../expanded-app/StatusFooter";
import { ClientService } from "lib/porter-apps/services";
import { UseFieldArrayUpdate } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { match } from "ts-pattern";
import useResizeObserver from "lib/hooks/useResizeObserver";
import { PorterAppVersionStatus } from "lib/hooks/useAppStatus";
import ServiceStatusFooter from "./ServiceStatusFooter";

interface ServiceProps {
  index: number;
  service: ClientService;
  update: UseFieldArrayUpdate<PorterAppFormData, "app.services" | "app.predeploy">;
  remove: (index: number) => void;
  status?: PorterAppVersionStatus[];
}

const ServiceContainer: React.FC<ServiceProps> = ({
  index,
  service,
  update,
  remove,
  status,
}) => {
  const [height, setHeight] = useState<Height>(service.expanded ? "auto" : 0);

  const UPPER_BOUND = 0.75;
  const UPPER_RAM = 1024;

  const [maxCPU, setMaxCPU] = useState(
    AWS_INSTANCE_LIMITS["t3"]["medium"]["vCPU"]
  ); //default is set to a t3 medium
  const [maxRAM, setMaxRAM] = useState(
    // round to 100
    Math.round(
      convert(AWS_INSTANCE_LIMITS["t3"]["medium"]["RAM"], "GiB").to("MB") *
      UPPER_BOUND / 100
    ) * 100
  ); //default is set to a t3 medium
  const context = useContext(Context);

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

  useEffect(() => {
    const { currentCluster, currentProject } = context;
    if (!currentCluster || !currentProject) {
      return;
    }
    var instanceType = "";


    // need to fix the below to not use chart
    // if (service) {
    //   //first check if there is a nodeSelector for the given application (Can be null)
    //   if (
    //     chart?.config?.[`${service.name.value}-${service.config.type}`]
    //       ?.nodeSelector?.["beta.kubernetes.io/instance-type"]
    //   ) {
    //     instanceType =
    //       chart?.config?.[`${service.name.value}-${service.config.type}`]
    //         ?.nodeSelector?.["beta.kubernetes.io/instance-type"];
    //     const [instanceClass, instanceSize] = instanceType.split(".");
    //     const currentInstance =
    //       AWS_INSTANCE_LIMITS[instanceClass][instanceSize];
    //     setMaxCPU(currentInstance.vCPU * UPPER_BOUND);
    //     setMaxRAM(currentInstance.RAM * UPPER_BOUND);
    //   }
    // }
    //Query the given nodes if no instance type is specified
    if (instanceType == "") {
      api
        .getClusterNodes(
          "<token>",
          {},
          {
            cluster_id: currentCluster.id,
            project_id: currentProject.id,
          }
        )
        .then(({ data }) => {
          if (data) {
            let largestInstanceType = {
              vCPUs: 2,
              RAM: 4,
            };

            data.forEach((node: any) => {
              if (node.labels["porter.run/workload-kind"] == "application") {
                var instanceType: string =
                  node.labels["beta.kubernetes.io/instance-type"];
                const [instanceClass, instanceSize] = instanceType.split(".");
                if (instanceClass && instanceSize) {
                  if (
                    AWS_INSTANCE_LIMITS[instanceClass] &&
                    AWS_INSTANCE_LIMITS[instanceClass][instanceSize]
                  ) {
                    let currentInstance =
                      AWS_INSTANCE_LIMITS[instanceClass][instanceSize];
                    largestInstanceType.vCPUs = currentInstance.vCPU;
                    largestInstanceType.RAM = currentInstance.RAM;
                  }
                }
              }
            });

<<<<<<< HEAD
            setMaxCPU(Math.fround(largestInstanceType.vCPUs));
            setMaxRAM(
              Math.round(
                convert(largestInstanceType.RAM, "GiB").to("MB"))

            );
=======
            // if the instance type has more than 4 GB ram, we use 90% of the ram/cpu
            // otherwise, we use 75%
            if (largestInstanceType.RAM > 4) {
              // round down to nearest 0.5 cores
              setMaxCPU(Math.floor(largestInstanceType.vCPUs * 0.9 * 2) / 2);
              setMaxRAM(
                Math.round(
                  convert(largestInstanceType.RAM, "GiB").to("MB") * 0.9 / 100
                ) * 100
              );
            } else {
              setMaxCPU(Math.floor(largestInstanceType.vCPUs * UPPER_BOUND * 2) / 2);
              setMaxRAM(
                Math.round(
                  convert(largestInstanceType.RAM, "GiB").to("MB") * UPPER_BOUND / 100
                ) * 100
              );
            }
>>>>>>> a5e37367d1889ae870a488b92f11210ed63fc173
          }
        })
        .catch((error) => { });
    }
  }, []);

  const renderTabs = (service: ClientService) => {
    return match(service)
      .with({ config: { type: "web" } }, (svc) => (
        <WebTabs index={index} service={svc} maxCPU={maxCPU} maxRAM={maxRAM} />
      ))
      .with({ config: { type: "worker" } }, (svc) => (
        <WorkerTabs
          index={index}
          service={svc}
          maxCPU={maxCPU}
          maxRAM={maxRAM}
        />
      ))
      .with({ config: { type: "job" } }, (svc) => (
        <JobTabs index={index} service={svc} maxCPU={maxCPU} maxRAM={maxRAM} />
      ))
      .with({ config: { type: "predeploy" } }, (svc) => (
        <JobTabs
          index={index}
          service={svc}
          maxCPU={maxCPU}
          maxRAM={maxRAM}
          isPredeploy
        />
      ))
      .exhaustive();
  };

  const renderIcon = (service: ClientService) => {
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
    transform: ${(props: { showExpanded?: boolean; }) =>
    props.showExpanded ? "" : "rotate(-90deg)"};
  }
`;

const Icon = styled.img`
  height: 18px;
  margin-right: 15px;
`;
