import Icon from 'components/porter/Icon';
import Spacer from 'components/porter/Spacer';
import Text from 'components/porter/Text';
import React from 'react'
import styled from 'styled-components';
import { getStatusColor, getStatusIcon } from '../utils';
import Link from 'components/porter/Link';
import { Service } from 'main/home/app-dashboard/new-app-flow/serviceTypes';
import { useLatestRevision } from 'main/home/app-dashboard/app-view/LatestRevisionContext';
import { deserializeService, serializedServiceFromProto } from 'lib/porter-apps/services';

type Props = {
    serviceDeploymentMetadata: Record<string, {
        status: string;
        type: string;
    }>;
    appName: string;
    revision: number;
}

const ServiceStatusDetail: React.FC<Props> = ({
    serviceDeploymentMetadata,
    appName,
    revision,
}) => {
    const { latestProto } = useLatestRevision();
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
                    const service = latestProto.services[key];
                    let externalUri = "";
                    if (service != null) {
                        const deserializedService = deserializeService({ service: serializedServiceFromProto({ service, name: key }) });
                        if (deserializedService.config.type === "web" && deserializedService.config.domains.length > 0) {
                            externalUri = deserializedService.config.domains[0].name.value;
                        }
                    }
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
                                {deploymentMetadata.type !== "job" &&
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
                                }
                                {deploymentMetadata.type === "job" &&
                                    <>
                                        <Link
                                            to={`/apps/${appName}/job-history?service=${key}`}
                                            hasunderline
                                            hoverColor="#949eff"
                                        >
                                            History
                                        </Link>
                                    </>
                                }
                                {externalUri !== "" &&
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