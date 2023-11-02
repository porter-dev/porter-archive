import React from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { Service } from "main/home/app-dashboard/new-app-flow/serviceTypes";

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
  const { latestClientServices } = useLatestRevision();
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
              <ServiceStatusTableData showBorderRight={false}>
                {serviceType !== "job" && (
                  <>
                    <Link
                      to={`/apps/${appName}/logs?version=${revision}&service=${key}`}
                      hasunderline
                      hoverColor="#949eff"
                    >
                      Logs
                    </Link>
                    <Spacer inline x={0.5} />
                    <Link
                      to={`/apps/${appName}/metrics?service=${key}`}
                      hasunderline
                      hoverColor="#949eff"
                    >
                      Metrics
                    </Link>
                  </>
                )}
                {serviceType === "job" && (
                  <>
                    <Link
                      to={`/apps/${appName}/job-history?service=${key}`}
                      hasunderline
                      hoverColor="#949eff"
                    >
                      History
                    </Link>
                  </>
                )}
                {externalUri !== "" && (
                  <>
                    <Spacer inline x={0.5} />
                    <Link
                      to={Service.prefixSubdomain(externalUri)}
                      hasunderline
                      hoverColor="#949eff"
                      target={"_blank"}
                    >
                      External Link
                    </Link>
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
`;

const ServiceStatusTableData = styled.td<{
  width?: string;
  showBorderRight?: boolean;
}>`
  padding: 8px 10px;
  display: flex;
  align-items: center;
  ${(props) => props.width && `width: ${props.width};`}
  ${({ showBorderRight = true }) =>
    showBorderRight && `border-right: 2px solid #ffffff11;`}
`;
