import Icon from 'components/porter/Icon';
import Spacer from 'components/porter/Spacer';
import Text from 'components/porter/Text';
import React from 'react'
import styled from 'styled-components';
import { getStatusColor, getStatusIcon } from '../utils';
import Link from 'components/porter/Link';
import { PorterAppDeployEvent } from "../types";
import { Service } from 'main/home/app-dashboard/new-app-flow/serviceTypes';

type Props = {
    serviceDeploymentMetadata: PorterAppDeployEvent["metadata"]["service_deployment_metadata"];
    appName: string;
    revision: number;
}

const ServiceStatusDetail: React.FC<Props> = ({
    serviceDeploymentMetadata,
    appName,
    revision,
}) => {
    const convertEventStatusToCopy = (status: string) => {
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
                    const deploymentMetadata = serviceDeploymentMetadata[key];
                    return (
                        <ServiceStatusTableRow key={key}>
                            <ServiceStatusTableData width={"100px"}>
                                <Text>{key}</Text>
                            </ServiceStatusTableData>
                            <ServiceStatusTableData width={"120px"}>
                                <Icon height="12px" src={getStatusIcon(deploymentMetadata.status)} />
                                <Spacer inline x={0.5} />
                                <Text color={getStatusColor(deploymentMetadata.status)}>{convertEventStatusToCopy(serviceDeploymentMetadata[key].status)}</Text>
                            </ServiceStatusTableData>
                            <ServiceStatusTableData>
                                <Link
                                    to={`/apps/${appName}/logs?version=${revision}&service=${key}`}
                                    hasunderline
                                    hoverColor="#949eff"
                                >
                                    Logs
                                </Link>
                                <Spacer inline x={0.5} />
                                <Link
                                    to={`/apps/${appName}/logs?version=${revision}&service=${key}`}
                                    hasunderline
                                    hoverColor="#949eff"
                                >
                                    Metrics
                                </Link>
                                {deploymentMetadata.external_uri !== "" &&
                                    <>
                                        <Spacer inline x={0.5} />
                                        <Link
                                            to={Service.prefixSubdomain(deploymentMetadata.external_uri)}
                                            hasunderline
                                            hoverColor="#949eff"
                                            target={"_blank"}
                                        >
                                            External Link
                                        </Link>
                                    </>
                                }
                            </ServiceStatusTableData>
                        </ServiceStatusTableRow>
                    );
                })}
            </tbody>
        </ServiceStatusTable>
    )
}

export default ServiceStatusDetail;

const ServiceStatusTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const ServiceStatusTableRow = styled.tr`
  display: flex;
  align-items: center;  
`;

const ServiceStatusTableData = styled.td`
  padding: 8px;
  display: flex;
  align-items: center;
  ${(props) => props.width && `width: ${props.width};`}

  &:not(:last-child) {
    border-right: 2px solid #ffffff11;
  }
`;