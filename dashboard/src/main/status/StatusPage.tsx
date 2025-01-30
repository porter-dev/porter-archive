import React, { useContext, useEffect, useState } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled, { ThemeProvider } from "styled-components";
import { z } from "zod";

import Back from "components/porter/Back";
import Container from "components/porter/Container";
import Expandable from "components/porter/Expandable";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { Context } from "shared/Context";

import midnight from "shared/themes/midnight";
import gradient from "assets/gradient.png";
import logo from "assets/logo.png";

import { ProjectListType, ClusterType } from "shared/types";
import api from "shared/api";
import ProjectStatusSection from "./ProjectStatusSection";



type Props = RouteComponentProps;


const StatusPage: React.FC<Props> = () => {
  const {user} = useContext(Context);

  const [projects, setProjects] = useState<ProjectListType[]>([{id: 0, name: "default"}]);

  useEffect(() => {
    if (user === undefined || user.userId === 0) {
      console.log("no user defined")
      return;
    }
    api
    .getProjects(
      "<token>",
      {},
      {id: user.userId},
    )
    .then((res) => res.data as ProjectListType[])
    .then((projectList) => {
      console.log(projectList);
      setProjects(projectList);
    })
    .catch((err) => {
      console.log(err);
    });
  }, [user]);

  return (
    <ThemeProvider theme={midnight}>
      <StyledStatusPage>
        <StatusSection>
          <Image src={logo} size={30} />
          <Spacer y={1.5} />
            <>
              {projects.map((project, _) => (
                <>
                  <ProjectStatusSection project={project} />
                  <Spacer y={1} />
                </>
              ))}
            </>
        </StatusSection>
      </StyledStatusPage>
    </ThemeProvider>
  );
};

export default withRouter(StatusPage);

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
