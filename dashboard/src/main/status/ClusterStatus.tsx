import React, { useEffect, useState } from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Expandable from "components/porter/Expandable";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

type Props = {
  projectId: number;
  clusterId: number;
};

type StatusData = {
  cluster_unresponsive: Array<{
    timestamp: string;
    status: string;
  }>;
  services: Array<{
    system_service: {
      name: string;
      namespace: string;
      involved_object_type: string;
    };
    system_statuses: Array<{
      timestamp: string;
      status: string;
    }>;
  }>;
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
  system_statuses: SystemStatus[];
};

// If you're also grouping services by namespace and want a type for the grouped structure:
type GroupedService = {
  system_service: Pick<SystemService, "name" | "involved_object_type">;
  system_statuses: SystemStatus[];
};

type GroupedServices = Record<string, GroupedService[]>;

const groupServicesByNamespace = (services: Service[]): GroupedServices => {
  return services.reduce<GroupedServices>((acc, service) => {
    const { namespace } = service.system_service;
    if (!acc[namespace]) {
      acc[namespace] = [];
    }
    acc[namespace].push({
      system_service: {
        name: service.system_service.name,
        involved_object_type: service.system_service.involved_object_type,
      },
      system_statuses: service.system_statuses,
    });
    return acc;
  }, {});
};

const ClusterStatus: React.FC<Props> = ({ projectId, clusterId }) => {
  // TODO: make API call to get cluster status
  const [statusData, setStatusData] = useState<any | null>(null);

  useEffect(() => {
    const groupedServices = groupServicesByNamespace(dummyResponse.services);
    setStatusData({
      cluster_unresponsive: dummyResponse.cluster_unresponsive,
      services: groupedServices,
    });
  }, []);

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
            const statusIndex =
              dummyResponse.cluster_unresponsive.length - (90 - i);
            return (
              <Bar
                key={i}
                isFirst={i === 0}
                isLast={i === 89}
                status={
                  dummyResponse.cluster_unresponsive[statusIndex]?.status ||
                  "unknown"
                }
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
            <>
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
                {statusData.services[key].map((service, i) => {
                  return (
                    <>
                      <Text color="helper">{service.system_service.name}</Text>
                      <Spacer y={0.25} />
                      <StatusBars>
                        {Array.from({ length: 90 }).map((_, i) => {
                          const statusIndex =
                            service.system_statuses.length - (90 - i);

                          return (
                            <Bar
                              key={i}
                              isFirst={i === 0}
                              isLast={i === 89}
                              status={
                                statusIndex >= 0
                                  ? service.system_statuses[statusIndex].status
                                  : "unknown"
                              }
                            />
                          );
                        })}
                      </StatusBars>
                      <Spacer y={0.25} />
                    </>
                  );
                })}
                <Spacer y={0.25} />
                <Container row spaced>
                  <Text color="helper">90 days ago</Text>
                  <Text color="helper">Today</Text>
                </Container>
              </Expandable>
            </>
          );
        })}
    </>
  );
};

export default ClusterStatus;

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

const dummyResponse = {
  cluster_unresponsive: [
    {
      timestamp: "4/1/24",
      status: "failure",
    },
    {
      timestamp: "4/2/24",
      status: "healthy",
    },
    {
      timestamp: "4/3/24",
      status: "healthy",
    },
    {
      timestamp: "4/4/24",
      status: "partial_failure",
    },
    {
      timestamp: "4/5/24",
      status: "healthy",
    },
    {
      timestamp: "4/6/24",
      status: "healthy",
    },
  ],
  services: [
    {
      system_service: {
        name: "cert-manager",
        namespace: "cert-manager",
        involved_object_type: "deployment",
      },
      system_statuses: [
        {
          timestamp: "4/1/24",
          status: "healthy",
        },
        {
          timestamp: "4/2/24",
          status: "healthy",
        },
        {
          timestamp: "4/3/24",
          status: "healthy",
        },
        {
          timestamp: "4/4/24",
          status: "healthy",
        },
        {
          timestamp: "4/5/24",
          status: "healthy",
        },
        {
          timestamp: "4/6/24",
          status: "healthy",
        },
      ],
    },
    {
      system_service: {
        name: "ca-manager",
        namespace: "cert-manager",
        involved_object_type: "statefulset",
      },
      system_statuses: [
        {
          timestamp: "4/1/24",
          status: "healthy",
        },
        {
          timestamp: "4/2/24",
          status: "healthy",
        },
        {
          timestamp: "4/3/24",
          status: "healthy",
        },
        {
          timestamp: "4/4/24",
          status: "partial_failure",
        },
        {
          timestamp: "4/5/24",
          status: "healthy",
        },
        {
          timestamp: "4/6/24",
          status: "healthy",
        },
      ],
    },
    {
      system_service: {
        name: "ca-injector",
        namespace: "cert-manager",
        involved_object_type: "statefulset",
      },
      system_statuses: [
        {
          timestamp: "4/1/24",
          status: "partial_failure",
        },
        {
          timestamp: "4/2/24",
          status: "partial_failure",
        },
        {
          timestamp: "4/3/24",
          status: "healthy",
        },
        {
          timestamp: "4/4/24",
          status: "healthy",
        },
        {
          timestamp: "4/5/24",
          status: "healthy",
        },
        {
          timestamp: "4/6/24",
          status: "healthy",
        },
      ],
    },
    {
      system_service: {
        name: "bar",
        namespace: "foo",
        involved_object_type: "statefulset",
      },
      system_statuses: [
        {
          timestamp: "4/1/24",
          status: "healthy",
        },
        {
          timestamp: "4/2/24",
          status: "healthy",
        },
        {
          timestamp: "4/3/24",
          status: "healthy",
        },
        {
          timestamp: "4/4/24",
          status: "failure",
        },
        {
          timestamp: "4/5/24",
          status: "healthy",
        },
        {
          timestamp: "4/6/24",
          status: "healthy",
        },
      ],
    },
    {
      system_service: {
        name: "alice",
        namespace: "foo",
        involved_object_type: "statefulset",
      },
      system_statuses: [
        {
          timestamp: "4/1/24",
          status: "healthy",
        },
        {
          timestamp: "4/2/24",
          status: "healthy",
        },
        {
          timestamp: "4/3/24",
          status: "healthy",
        },
        {
          timestamp: "4/4/24",
          status: "healthy",
        },
        {
          timestamp: "4/5/24",
          status: "healthy",
        },
        {
          timestamp: "4/6/24",
          status: "healthy",
        },
      ],
    },
    {
      system_service: {
        name: "bob",
        namespace: "foo",
        involved_object_type: "statefulset",
      },
      system_statuses: [
        {
          timestamp: "4/1/24",
          status: "healthy",
        },
        {
          timestamp: "4/2/24",
          status: "healthy",
        },
        {
          timestamp: "4/3/24",
          status: "healthy",
        },
        {
          timestamp: "4/4/24",
          status: "partial_failure",
        },
        {
          timestamp: "4/5/24",
          status: "healthy",
        },
        {
          timestamp: "4/6/24",
          status: "healthy",
        },
      ],
    },
  ],
};
