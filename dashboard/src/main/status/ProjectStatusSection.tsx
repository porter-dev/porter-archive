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
                        <ClusterStatusSection cluster={cluster} projectId={project.id} />
                        <Spacer y={1} />
                    </>
                ))}
            </Expandable>
        </>
    );
}

export default ProjectStatusSection;
