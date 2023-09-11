import React, { useContext, useEffect, useState } from "react";
import AnimateHeight, { Height } from "react-animate-height";
import styled from "styled-components";
import _ from "lodash";

import web from "assets/web.png";
import worker from "assets/worker.png";
import job from "assets/job.png";

import Spacer from "components/porter/Spacer";
import WebTabs from "./tabs/WebTabs";
import WorkerTabs from "./tabs/WorkerTabs";
import JobTabs from "./tabs/JobTabs";
import { Service } from "./serviceTypes";
import StatusFooter from "../expanded-app/StatusFooter";
import ReleaseTabs from "./tabs/ReleaseTabs";
import { Context } from "shared/Context";
import { AWS_INSTANCE_LIMITS } from "./tabs/utils";
import api from "shared/api";

interface ServiceProps {
  service: Service;
  chart?: any;
  editService: (service: Service) => void;
  deleteService: () => void;
  setExpandedJob?: (x: string) => void;
}

const ServiceContainer: React.FC<ServiceProps> = ({
  service,
  chart,
  deleteService,
  editService,
  setExpandedJob,
}) => {
  const [height, setHeight] = React.useState<Height>("auto");

  const UPPER_BOUND_RAM = .75;
  const UPPER_BOUND_CPU = .5;

  const [maxCPU, setMaxCPU] = useState(2 * UPPER_BOUND_CPU); //default is set to a t3 medium 
  const [maxRAM, setMaxRAM] = useState(4 * UPPER_BOUND_RAM); //default is set to a t3 medium
  const context = useContext(Context);

  useEffect(() => {
    const { currentCluster, currentProject } = context;
    if (!currentCluster || !currentProject) {
      return;
    }
    var instanceType = "";


    if (service) {
      const serviceName = service.name;

      //first check if there is a nodeSelector for the given application (Can be null)
      if (chart?.config?.[`${serviceName}-${service.type}`]?.nodeSelector?.["beta.kubernetes.io/instance-type"]) {
        instanceType = chart?.config?.[`${serviceName}-${service.type}`]?.nodeSelector?.["beta.kubernetes.io/instance-type"]
        const [instanceClass, instanceSize] = instanceType.split('.');
        const currentInstance = AWS_INSTANCE_LIMITS[instanceClass][instanceSize];
        setMaxCPU(currentInstance.vCPU * UPPER_BOUND_CPU);
        setMaxRAM(currentInstance.RAM * UPPER_BOUND_RAM);
      }
    }
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

            // TODO: type this response
            data.forEach((node: any) => {
              if (node.labels['porter.run/workload-kind'] == "application") {
                var instanceType: string = node.labels['beta.kubernetes.io/instance-type'];
                const [instanceClass, instanceSize] = instanceType.split('.');
                if (instanceClass && instanceSize) {
                  if (AWS_INSTANCE_LIMITS[instanceClass] && AWS_INSTANCE_LIMITS[instanceClass][instanceSize]) {
                    let currentInstance = AWS_INSTANCE_LIMITS[instanceClass][instanceSize];
                    largestInstanceType.vCPUs = currentInstance.vCPU;
                    largestInstanceType.RAM = currentInstance.RAM;

                  }
                }
              }
            });

            setMaxCPU(largestInstanceType.vCPUs * UPPER_BOUND_CPU);
            setMaxRAM(largestInstanceType.RAM * UPPER_BOUND_RAM);
          }
        }).catch((error) => {

        });
    }
  }, []);
  // TODO: calculate heights instead of hardcoding them
  const renderTabs = (service: Service) => {
    switch (service.type) {
      case "web":
        return (
          <WebTabs
            service={service}
            editService={editService}
            setHeight={setHeight}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
          />
        );
      case "worker":
        return (
          <WorkerTabs
            service={service}
            editService={editService}
            setHeight={setHeight}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
          />
        );
      case "job":
        return (
          <JobTabs
            service={service}
            editService={editService}
            setHeight={setHeight}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
          />
        );
      case "release":
        return (
          <ReleaseTabs
            service={service}
            editService={editService}
            setHeight={setHeight}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
          />
        );
    }
  };

  const renderIcon = (service: Service) => {
    switch (service.type) {
      case "web":
        return <Icon src={web} />;
      case "worker":
        return <Icon src={worker} />;
      case "job":
        return <Icon src={job} />;
      case "release":
        return <Icon src={job} />;
    }
  };

  const getHasBuiltImage = () => {
    if (chart?.chart?.values == null) {
      return false;
    }
    return !_.isEmpty((Object.values(chart.chart.values)[0] as any)?.global);
  };

  return (
    <>
      <ServiceHeader
        showExpanded={service.expanded}
        onClick={() => editService({ ...service, expanded: !service.expanded })}
        chart={chart}
        bordersRounded={!getHasBuiltImage() && !service.expanded}
      >
        <ServiceTitle>
          <ActionButton>
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          {renderIcon(service)}
          {service.name.trim().length > 0 ? service.name : "New Service"}
        </ServiceTitle>
        {service.canDelete && (
          <ActionButton onClick={(e) => {
            e.stopPropagation();
            deleteService();
          }}>
            <span className="material-icons">delete</span>
          </ActionButton>
        )}
      </ServiceHeader>
      <AnimateHeight height={service.expanded ? height : 0}>
        <StyledSourceBox
          showExpanded={service.expanded}
          chart={chart}
          hasFooter={chart && service && getHasBuiltImage()}
        >
          {renderTabs(service)}
        </StyledSourceBox>
      </AnimateHeight>
      {chart &&
        service &&
        // Check if has built image
        getHasBuiltImage() && (
          <StatusFooter
            setExpandedJob={setExpandedJob}
            chart={chart}
            service={service}
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
  showExpanded: boolean;
  chart: any;
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
  showExpanded: boolean;
  chart: any;
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
    transform: ${(props: { showExpanded: boolean; chart: any }) =>
    props.showExpanded ? "" : "rotate(-90deg)"};
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
