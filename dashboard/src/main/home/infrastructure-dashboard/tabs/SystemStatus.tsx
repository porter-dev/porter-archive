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
  cluster_health_histories: Record<string, Record<number, DailyHealthStatus>>;
  service_health_histories_grouped: Record<string, GroupedService[]>;
};

type SystemService = {
  name: string;
  namespace: string;
  involved_object_type: string;
};

type HealthStatus = {
  start_time: string;
  end_time: string;
  status: "failure" | "healthy" | "partial_failure" | "undefined";
  description: string;
};

type DailyHealthStatus = {
  status_percentages: Record<string, number>;
  health_statuses: HealthStatus[];
};

type ServiceStatusHistory = {
  system_service: SystemService;
  daily_health_history: Record<number, DailyHealthStatus>;
};

// If you're also grouping services by namespace and want a type for the grouped structure:
type GroupedService = {
  system_service: SystemService;
  daily_health_history: Record<number, DailyHealthStatus>;
};

type GroupedServices = Record<string, GroupedService[]>;

// Initialize statusData with empty arrays
const initialState: StatusData = {
  cluster_health_histories: {},
  service_health_histories_grouped: {},
};

const groupServicesByNamespace = (
  serviceStatusHistories: ServiceStatusHistory[]
): GroupedServices => {
  return serviceStatusHistories.reduce<GroupedServices>(
    (acc, serviceStatusHistory) => {
      const { namespace } = serviceStatusHistory.system_service;
      if (!acc[namespace]) {
        acc[namespace] = [];
      }
      acc[namespace].push({
        system_service: {
          name: serviceStatusHistory.system_service.name,
          namespace: serviceStatusHistory.system_service.namespace,
          involved_object_type:
            serviceStatusHistory.system_service.involved_object_type,
        },
        daily_health_history: serviceStatusHistory.daily_health_history,
      });
      return acc;
    },
    {}
  );
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
          cluster_health_histories: data.cluster_status_histories,
          service_health_histories_grouped: groupedServices,
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }, [projectId, cluster]);

  return (
    <>
      <React.Fragment key={"Cluster Health"}>
        <Spacer y={1} />
        <Expandable
          alt
          preExpanded
          header={
            <Container row>
              <Text size={16}>{"Cluster Health"}</Text>
              <Spacer x={1} inline />
              <Text color="#01a05d">Operational</Text>
            </Container>
          }
        >
          {statusData?.cluster_health_histories &&
            Object.keys(statusData?.cluster_health_histories).map((key) => {
              return (
                <React.Fragment key={key}>
                  <Text color="helper">{key}</Text>
                  <Spacer y={0.25} />
                  <StatusBars>
                    {Array.from({ length: 90 }).map((_, i) => {
                      const status = statusData?.cluster_health_histories[key][
                        89 - i
                      ]
                        ? "failure"
                        : "healthy";
                      return (
                        <Bar
                          key={i}
                          isFirst={i === 0}
                          isLast={i === 89}
                          status={status}
                        />
                      );
                    })}
                  </StatusBars>
                  <Spacer y={0.25} />
                </React.Fragment>
              );
            })}
        </Expandable>
        <Spacer y={0.25} />
        <Container row spaced>
          <Text color="helper">90 days ago</Text>
          <Text color="helper">Today</Text>
        </Container>
      </React.Fragment>

      {statusData?.service_health_histories_grouped &&
        Object.keys(statusData?.service_health_histories_grouped).map((key) => {
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
                {statusData.service_health_histories_grouped[key].map(
                  (serviceStatusHistory: ServiceStatusHistory) => {
                    return (
                      <React.Fragment
                        key={serviceStatusHistory.system_service.name}
                      >
                        <Text color="helper">
                          {serviceStatusHistory.system_service.name}
                        </Text>
                        <Spacer y={0.25} />
                        <StatusBars>
                          {Array.from({ length: 90 }).map((_, i) => {
                            const status =
                              serviceStatusHistory.daily_health_history?.[
                                89 - i
                              ] === undefined
                                ? "healthy"
                                : "failure";
                            return (
                              <Bar
                                key={i}
                                isFirst={i === 0}
                                isLast={i === 89}
                                status={status}
                              />
                            );
                          })}
                        </StatusBars>
                        <Spacer y={0.25} />
                      </React.Fragment>
                    );
                  }
                )}
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
