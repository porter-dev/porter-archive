import React from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { Service } from "main/home/app-dashboard/new-app-flow/serviceTypes";

import metrics from "assets/bar-group-03.svg";
import calendar from "assets/calendar-02.svg";
import document from "assets/document.svg";
import link from "assets/external-link.svg";
import job from "assets/job.png";
import web from "assets/web.png";
import worker from "assets/worker.png";

import { getStatusColor, getStatusIcon } from "../utils";

type Props = {
  serviceDeploymentMetadata: Record<
    string,
    {
      status: string;
      type: string;
    }
  >;
  appName: string;
  revision: number;
};

const ServiceStatusDetail: React.FC<Props> = ({
  serviceDeploymentMetadata,
  appName,
  revision,
}) => {
  const { latestClientServices, latestNotifications } = useLatestRevision();
  const convertEventStatusToCopy = (status: string): string => {
    switch (status) {
      case "PROGRESSING":
        return "DEPLOYING";
      case "SUCCESS":
        return "DEPLOYED";
      case "FAILED":
        return "FAILED";
      case "CANCELED":
        return "CANCELED";
      default:
        return "UNKNOWN";
    }
  };

  return (
    <ServiceStatusTable>
      <tbody>
        {Object.keys(serviceDeploymentMetadata).map((key) => {
          const { status: serviceStatus, type: serviceType } =
            serviceDeploymentMetadata[key];
          const service = latestClientServices.find(
            (s) => s.name.value === key
          );
          const externalUri =
            service != null &&
            service.config.type === "web" &&
            service.config.domains.length
              ? service.config.domains[0].name.value
              : "";
          const notificationsExistForService = latestNotifications.some(
            (n) => n.serviceName === key
          );
          return (
            <ServiceStatusTableRow key={key}>
              <ServiceStatusTableData width={"200px"}>
                {match(serviceType)
                  .with("web", () => <Icon src={web} height="14px" />)
                  .with("worker", () => <Icon src={worker} height="14px" />)
                  .with("job", () => <Icon src={job} height="14px" />)
                  .otherwise(() => null)}
                <Spacer inline x={0.5} />
                <Text>{key}</Text>
              </ServiceStatusTableData>
              <ServiceStatusTableData width={"120px"}>
                <Icon height="12px" src={getStatusIcon(serviceStatus)} />
                <Spacer inline x={0.5} />
                <Text color={getStatusColor(serviceStatus)}>
                  {convertEventStatusToCopy(serviceStatus)}
                </Text>
              </ServiceStatusTableData>
              <ServiceStatusTableData>
                {notificationsExistForService ? (
                  <>
                    <Tag>
                      <Link
                        to={`/apps/${appName}/notifications?service=${key}`}
                      >
                        <TagIcon src={document} />
                        Notifications
                      </Link>
                    </Tag>
                  </>
                ) : (
                  <>
                    {serviceType !== "job" && (
                      <>
                        <Tag>
                          <Link
                            to={`/apps/${appName}/logs?version=${revision}&service=${key}`}
                          >
                            <TagIcon src={document} />
                            Logs
                          </Link>
                        </Tag>
                        <Spacer inline x={0.5} />
                        <Tag>
                          <Link to={`/apps/${appName}/metrics?service=${key}`}>
                            <TagIcon src={metrics} />
                            Metrics
                          </Link>
                        </Tag>
                      </>
                    )}
                    {serviceType === "job" && (
                      <Tag>
                        <TagIcon src={calendar} style={{ marginTop: "2px" }} />
                        <Link
                          to={`/apps/${appName}/job-history?service=${key}`}
                        >
                          History
                        </Link>
                      </Tag>
                    )}
                    {externalUri !== "" && (
                      <>
                        <Spacer inline x={0.5} />
                        <Tag>
                          <Link
                            to={Service.prefixSubdomain(externalUri)}
                            target={"_blank"}
                            showTargetBlankIcon={false}
                          >
                            <TagIcon src={link} />
                            External Link
                          </Link>
                        </Tag>
                      </>
                    )}
                  </>
                )}
              </ServiceStatusTableData>
            </ServiceStatusTableRow>
          );
        })}
      </tbody>
    </ServiceStatusTable>
  );
};

export default ServiceStatusDetail;

const ServiceStatusTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const ServiceStatusTableRow = styled.tr`
  display: flex;
  align-items: center;
  > td:last-child {
    border-right: none;
  }
`;

const ServiceStatusTableData = styled.td<{
  width?: string;
}>`
  padding: 8px 10px;
  display: flex;
  align-items: center;
  border-right: 2px solid #ffffff11;
  ${(props) => props.width && `width: ${props.width};`}
`;

const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
