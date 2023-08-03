import Icon from 'components/porter/Icon';
import Spacer from 'components/porter/Spacer';
import Text from 'components/porter/Text';
import React from 'react'
import styled from 'styled-components';
import { getStatusColor, getStatusIcon } from '../utils';
import Link from 'components/porter/Link';
import globe from "assets/globe.svg";

type Props = {
    serviceStatusMap: Record<string, string>;
    appName: string;
    revision: number;
}

const ServiceStatusDetail: React.FC<Props> = ({
    serviceStatusMap,
    appName,
    revision,
}) => {
    return (
        <ServiceStatusTable>
            <tbody>
                {Object.keys(serviceStatusMap).map((key) => {
                    return (
                        <ServiceStatusTableRow key={key}>
                            <ServiceStatusTableData width={"50px"}>
                                <Icon height="12px" src={globe} />
                            </ServiceStatusTableData>
                            <ServiceStatusTableData width={"100px"}>
                                <Text>{key}</Text>
                            </ServiceStatusTableData>
                            <ServiceStatusTableData width={"100px"}>
                                <Icon height="12px" src={getStatusIcon(serviceStatusMap[key])} />
                                <Spacer inline x={0.5} />
                                <Text color={getStatusColor(serviceStatusMap[key])}>{serviceStatusMap[key] === "PROGRESSING" ? "DEPLOYING" : serviceStatusMap[key]}</Text>
                            </ServiceStatusTableData>
                            <ServiceStatusTableData>
                                <ServiceLink
                                    to={`/apps/${appName}/logs?version=${revision}&service=${key}`}
                                >
                                    [Logs]
                                </ServiceLink>
                                <Spacer inline x={0.5} />
                                <ServiceLink
                                    to={`/apps/${appName}/logs?version=${revision}&service=${key}`}
                                >
                                    [Metrics]
                                </ServiceLink>
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
  border-right: 2px solid #ffffff11;
`;

const ServiceLink = styled(Link)`
  :hover {
    color: #8590ff;  
  }
`;