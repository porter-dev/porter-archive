import React, { useContext, useEffect, useState } from "react";

import { ProjectListType, ClusterType } from "shared/types";

import styled from "styled-components";
import Container from "components/porter/Container";
import Expandable from "components/porter/Expandable";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import logo from "assets/logo.png";

import Back from "components/porter/Back";
import Text from "components/porter/Text";
import { Context } from "shared/Context";

import midnight from "shared/themes/midnight";
import gradient from "assets/gradient.png";

import api from "shared/api";

import {StatusData, DailyHealthStatus} from "shared/types";

type Props = { cluster: ClusterType, projectId: number};

const ClusterStatusSection: React.FC<Props> = ({ cluster, projectId }) => { 
    const [statusData, setStatusData] = useState<StatusData>({} as StatusData);

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
          console.log(data);
          setStatusData({
            cluster_health_histories: data.cluster_status_histories,
            service_health_histories_grouped: {},
          });
        })
        .catch((err) => {
          console.error(err);
        });
    }, [projectId, cluster]);
    return (
        <>
            <Expandable
                key={cluster.id}
                alt
                header={
                    <Container row>
                        <Text size={16}> {cluster.name} </Text>
                        <Spacer x={1} inline />
                        <Text color="#01a05d">Operational</Text>
                    </Container>
                }
            >
          {
                statusData?.cluster_health_histories &&
                Object.keys(statusData?.cluster_health_histories).map((key) => {
                return (
                    <React.Fragment key={key}>
                    <Text color="helper">{key}</Text>
                    <Spacer y={0.25} />
                    <StatusBars>
                        {Array.from({ length: 90 }).map((_, i) => {
                        const status =
                            statusData?.cluster_health_histories[key][89 - i] ? "failure" : "healthy";
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
        </>
    );
}


export default ClusterStatusSection;

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
}

const Badge = styled.div`
  background: ${(props) => props.theme.clickable.bg};
  padding: 5px 10px;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
`;

const Letter = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  padding-bottom: 2px;
  font-weight: 500;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProjectImage = styled.img`
  width: 100%;
  height: 100%;
`;

const ProjectIcon = styled.div`
  width: 26px;
  min-width: 26px;
  height: 26px;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-right: 10px;
  font-weight: 400;
`;

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

const StyledStatusPage = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: auto;
  padding-top: 50px;
  display: flex;
  align-items: center;
  flex-direction: column;
`;

const StatusSection = styled.div`
  width: calc(100% - 40px);
  padding-bottom: 50px;
  max-width: 1000px;
`;
