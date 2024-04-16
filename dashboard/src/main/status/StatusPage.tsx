import React, { useMemo } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled, { ThemeProvider } from "styled-components";
import { z } from "zod";

import Back from "components/porter/Back";
import Container from "components/porter/Container";
import Expandable from "components/porter/Expandable";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import midnight from "shared/themes/midnight";
import gradient from "assets/gradient.png";
import logo from "assets/logo.png";

import ClusterStatus from "./ClusterStatus";

type Props = RouteComponentProps;

const StatusPage: React.FC<Props> = ({ match }) => {
  // TODO: retrieve project and cluster names
  const projectName = "some-project";
  const clusterName = "some-cluster";

  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        projectId: z.string().optional(),
        clusterId: z.string().optional(),
      })
      .safeParse(params);

    if (
      !validParams.success ||
      !validParams.data.clusterId ||
      !validParams.data.projectId
    ) {
      return {};
    }
    const projectId = parseInt(validParams.data.projectId);
    const clusterId = parseInt(validParams.data.clusterId);
    return {
      projectId,
      clusterId,
    };
  }, [match]);

  return (
    <ThemeProvider theme={midnight}>
      <StyledStatusPage>
        <StatusSection>
          <Image src={logo} size={30} />
          <Spacer y={1.5} />
          {params.projectId && params.clusterId ? (
            <>
              <Back to={`/status`} />
              <Container row>
                <ProjectIcon>
                  <ProjectImage src={gradient} />
                  <Letter>{projectName[0].toUpperCase()}</Letter>
                </ProjectIcon>
                <Text size={16}>{projectName}</Text>
                <Spacer x={1} inline />
                <Badge>{clusterName}</Badge>
              </Container>
              <Spacer y={1} />
              <ClusterStatus
                projectId={params.projectId}
                clusterId={params.clusterId}
              />
            </>
          ) : (
            <>
              {Array.from({ length: 100 }).map((_, j) => (
                <>
                  <Expandable
                    key={j}
                    alt
                    header={
                      <Container row>
                        <Text size={16}>project-{j}</Text>
                        <Spacer x={1} inline />
                        <Text color="#01a05d">Operational</Text>
                      </Container>
                    }
                  >
                    <Spacer y={0.25} />
                    <Container row spaced>
                      <Text color="helper">cluster-1</Text>
                      <Text color="#01a05d">Operational</Text>
                    </Container>
                    <Spacer y={0.25} />
                    <StatusBars>
                      {Array.from({ length: 90 }).map((_, i) => (
                        <Bar key={i} isFirst={i === 0} isLast={i === 89} />
                      ))}
                    </StatusBars>
                    <Spacer y={0.5} />
                    <Container row spaced>
                      <Text color="helper">cluster-2</Text>
                      <Text color="#01a05d">Operational</Text>
                    </Container>
                    <Spacer y={0.25} />
                    <StatusBars>
                      {Array.from({ length: 90 }).map((_, i) => (
                        <Bar key={i} isFirst={i === 0} isLast={i === 89} />
                      ))}
                    </StatusBars>
                    <Spacer y={0.5} />
                    <Container row spaced>
                      <Text color="helper">cluster-3</Text>
                      <Text color="#01a05d">Operational</Text>
                    </Container>
                    <Spacer y={0.25} />
                    <StatusBars>
                      {Array.from({ length: 90 }).map((_, i) => (
                        <Bar key={i} isFirst={i === 0} isLast={i === 89} />
                      ))}
                    </StatusBars>
                    <Spacer y={0.5} />
                    <Container row spaced>
                      <Text color="helper">90 days ago</Text>
                      <Text color="helper">Today</Text>
                    </Container>
                    <Spacer y={0.5} />
                  </Expandable>
                  <Spacer y={1} />
                </>
              ))}
            </>
          )}
        </StatusSection>
      </StyledStatusPage>
    </ThemeProvider>
  );
};

export default withRouter(StatusPage);

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
