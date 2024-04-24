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

import ClusterStatusSection from "./ClusterStatusSection";

type Props = { project: ProjectListType };

const ProjectStatusSection: React.FC<Props> = ({ project }) => {
    const [clusters, setClusters] = useState<ClusterType[]>([]);

    useEffect(() => {
        if (!project || !project.id) {
            console.log("project undefined")
            return;
        }
        api.
            getClusters(
                "<token>",
                {},
                { id: project.id },
            )
            .then((res) => res.data as ClusterType[])
            .then((clustersList) => {
                console.log(clustersList);
                setClusters(clustersList);
            })
            .catch((err) => {
                console.log(err);
            });
    }, [project]);

    return (
        <>
            <Expandable
                key={project.id}
                alt
                header={
                    <Container row>
                        <Text size={16}> {project.name} </Text>
                        <Spacer x={1} inline />
                        <Text color="#01a05d">Operational</Text>
                    </Container>
                }
            >
                {clusters.map((cluster, _) => (
                    <>
                        <Spacer y={0.25} />
                        <Container row spaced>
                            <Text color="helper">{cluster.name}</Text>
                            <Text color="#01a05d">Operational</Text>
                        </Container>
                        <Spacer y={0.25} />
                        <StatusBars>
                            {Array.from({ length: 90 }).map((_, i) => (
                                <Bar key={i} isFirst={i === 0} isLast={i === 89} />
                            ))}
                        </StatusBars>
                        <Spacer y={0.5} />
                    </>
                ))}
            </Expandable>
        </>
    );
}

export default ProjectStatusSection;

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

const Bar = styled.div<{ isFirst: boolean; isLast: boolean }>`
  height: 20px;
  display: flex;
  flex: 1;
  border-top-left-radius: ${(props) => (props.isFirst ? "5px" : "0")};
  border-bottom-left-radius: ${(props) => (props.isFirst ? "5px" : "0")};
  border-top-right-radius: ${(props) => (props.isLast ? "5px" : "0")};
  border-bottom-right-radius: ${(props) => (props.isLast ? "5px" : "0")};
  background: linear-gradient(#01a05d, #0f2527);
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
