import React, { useEffect, useState } from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Expandable from "components/porter/Expandable";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import api from "shared/api";

import { useClusterContext } from "../ClusterContextProvider";

type Props = {};

type StatusData = {
  cluster_responsive: Array<{
    timestamp: string;
    responsive: boolean;
  }>;
  services: Record<string, GroupedService[]>;
};

type SystemService = {
  name: string;
  namespace: string;
  involved_object_type: string;
};

type SystemStatus = {
  timestamp: string;
  status: "failure" | "healthy" | "partial_failure";
};

type Service = {
  system_service: SystemService;
  status_history: SystemStatus[];
};

// If you're also grouping services by namespace and want a type for the grouped structure:
type GroupedService = {
  system_service: SystemService;
  status_history: SystemStatus[];
};

type GroupedServices = Record<string, GroupedService[]>;

// Initialize statusData with empty arrays
const initialState: StatusData = {
  cluster_responsive: [],
  services: {},
};

const groupServicesByNamespace = (services: Service[]): GroupedServices => {
  return services.reduce<GroupedServices>((acc, service) => {
    const { namespace } = service.system_service;
    if (!acc[namespace]) {
      acc[namespace] = [];
    }
    acc[namespace].push({
      system_service: {
        name: service.system_service.name,
        namespace: service.system_service.namespace,
        involved_object_type: service.system_service.involved_object_type,
      },
      status_history: service.status_history,
    });
    return acc;
  }, {});
};

const SystemStatus: React.FC<Props> = () => {
  const { projectId, cluster } = useClusterContext();

  const [statusData, setStatusData] = useState<StatusData>(initialState);

  useEffect(() => {
    if (!projectId || !cluster) {
      return;
    }

    api
      .systemStatusHistory(
        "<token>",
        {},
        {
          projectId,
          clusterId: cluster.id,
        }
      )
      .then(({ data }) => {
        const groupedServices = groupServicesByNamespace(
          data.system_service_status_histories
        );
        setStatusData({
          cluster_responsive: data.cluster_status_history,
          services: groupedServices,
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }, [projectId, cluster]);

  return (
    <>
      <Expandable
        alt
        preExpanded
        header={
          <Container row>
            <Text size={16}>Cluster reachable</Text>
            <Spacer x={1} inline />
            <Text color="#01a05d">Operational</Text>
          </Container>
        }
      >
        <StatusBars>
          {Array.from({ length: 90 }).map((_, i) => {
            const statusIndex = 89 - i;
            const responsive =
              statusData?.cluster_responsive[statusIndex]?.responsive || true; // Provide "true" as the default value
            return (
              <Bar
                key={i}
                isFirst={i === 0}
                isLast={i === 89}
                status={responsive ? "healthy" : "failure"} // Use "responsive" if the value is true, otherwise "unknown"
              />
            );
          })}
        </StatusBars>
        <Spacer y={0.5} />
        <Container row spaced>
          <Text color="helper">90 days ago</Text>
          <Text color="helper">Today</Text>
        </Container>
      </Expandable>
      {statusData?.services &&
        Object.keys(statusData?.services).map((key) => {
          return (
            <React.Fragment key={key}>
              <Spacer y={1} />
              <Expandable
                alt
                preExpanded
                header={
                  <Container row>
                    <Text size={16}>{key}</Text>
                    <Spacer x={1} inline />
                    <Text color="#01a05d">Operational</Text>
                  </Container>
                }
              >
                {statusData.services[key].map((service: Service) => {
                  return (
                    <React.Fragment key={service.system_service.name}>
                      <Text color="helper">{service.system_service.name}</Text>
                      <Spacer y={0.25} />
                      <StatusBars>
                        {Array.from({ length: 90 }).map((_, i) => {
                          const statusIndex = 89 - i;
                          return (
                            <Bar
                              key={i}
                              isFirst={i === 0}
                              isLast={i === 89}
                              status={
                                service.status_history[statusIndex]?.status ||
                                "healthy"
                              }
                            />
                          );
                        })}
                      </StatusBars>
                      <Spacer y={0.25} />
                    </React.Fragment>
                  );
                })}
                <Spacer y={0.25} />
                <Container row spaced>
                  <Text color="helper">90 days ago</Text>
                  <Text color="helper">Today</Text>
                </Container>
              </Expandable>
            </React.Fragment>
          );
        })}
    </>
  );
};

export default SystemStatus;

const getBackgroundGradient = (status: string): string => {
  switch (status) {
    case "healthy":
      return "linear-gradient(#01a05d, #0f2527)";
    case "failure":
      return "linear-gradient(#E1322E, #25100f)";
    case "partial_failure":
      return "linear-gradient(#E49621, #25270f)";
    default:
      return "linear-gradient(#76767644, #76767622)"; // Default or unknown status
  }
};
const Bar = styled.div<{ isFirst: boolean; isLast: boolean; status: string }>`
  height: 20px;
  display: flex;
  flex: 1;
  border-top-left-radius: ${(props) => (props.isFirst ? "5px" : "0")};
  border-bottom-left-radius: ${(props) => (props.isFirst ? "5px" : "0")};
  border-top-right-radius: ${(props) => (props.isLast ? "5px" : "0")};
  border-bottom-right-radius: ${(props) => (props.isLast ? "5px" : "0")};
  background: ${(props) => getBackgroundGradient(props.status)};
`;

const StatusBars = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 2px;
`;
