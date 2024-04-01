import React, { useContext, useEffect, useMemo, useState } from "react";

import { useRouting } from "shared/routing";
import api from "shared/api";
import SaveButton from "components/SaveButton";

import backArrow from "assets/back_arrow.png";
import styled from "styled-components";

import gradient from "assets/gradient.png";
import PageIllustration from "components/PageIllustration";
import { Context } from "shared/Context";
import { isAlphanumeric } from "shared/common";

import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";
import TitleSection from "components/TitleSection";
import WelcomeForm from "./WelcomeForm";
import { trackCreateNewProject } from "shared/anayltics";
import { ProjectListType } from "shared/types";

type ValidationError = {
  hasError: boolean;
  description?: string;
};

export const NewProjectFC = () => {
  const {
    user,
    setProjects,
    setCurrentProject,
    canCreateProject,
    projects,
  } = useContext(Context);
  const { pushFiltered } = useRouting();
  const [buttonStatus, setButtonStatus] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!canCreateProject) {
      pushFiltered("/", []);
    }
  }, [canCreateProject]);

  const isFirstProject = useMemo(() => {
    return !(projects?.length >= 1);
  }, [projects]);

  const validateProjectName = (): ValidationError => {
    if (name === "") {
      return {
        hasError: true,
        description: "The name cannot be empty. Please fill the input.",
      };
    }
    if (!isAlphanumeric(name)) {
      return {
        hasError: true,
        description:
          'Please be sure that the text is alphanumeric. (lowercase letters, numbers, and "-" only)',
      };
    }
    if (name.length > 25) {
      return {
        hasError: true,
        description:
          "The length of the name cannot be more than 25 characters.",
      };
    }

    return {
      hasError: false,
    };
  };

  const createProject = async () => {
    const projectName = name;
    setButtonStatus("loading");
    const validation = validateProjectName();

    if (validation.hasError) {
      setButtonStatus(validation.description);
      return;
    }

    try {
      const project = await api
        .createProject("<token>", { name: projectName }, {})
        .then((res) => res.data);

      const projectList = await api
        .getProjects(
          "<token>",
          {},
          {
            id: user.userId,
          }
        )
        .then((res) => res.data as ProjectListType[]);
      setProjects(projectList);
      setCurrentProject(project);
      trackCreateNewProject();

      if (project?.sandbox_enabled) {
        await api.connectProjectToCluster(
          "<token>",
          {},
          { id: project.id }
        )
        .then(() => {
          api.inviteAdmin(
            "<token>",
            {},
            { project_id: project.id }
          )
          .then(() => {
            setButtonStatus("successful");
            pushFiltered("/apps", []);
          })
        })
        .catch((err) => {
          setButtonStatus("Couldn't create project, try again.");
          console.log(err)
        })

      } else {
        setButtonStatus("successful");
        pushFiltered("/onboarding", []);
      }
    } catch (error) {
      setButtonStatus("Couldn't create project, try again.");
      console.log(error);
    }
  };

  const renderContents = () => {
    return (
      <>
        <FadeWrapper>
          {!isFirstProject && (
            <BackButton
              onClick={() => {
                pushFiltered("/dashboard", []);
              }}
            >
              <BackButtonImg src={backArrow} />
            </BackButton>
          )}
          <TitleSection>New project</TitleSection>
        </FadeWrapper>
        <FadeWrapper delay="0.7s">
          <Helper>
            Project name
            <Warning highlight={validateProjectName().hasError}>
              (lowercase letters, numbers, and "-" only)
            </Warning>
            <Required>*</Required>
          </Helper>
        </FadeWrapper>
        <SlideWrapper delay="1.2s">
          <InputWrapper>
            <ProjectIcon>
              <ProjectImage src={gradient} />
              <Letter>
                {name ? name.toUpperCase().substring(0, 1) : "-"}
              </Letter>
            </ProjectIcon>
            <InputRow
              type="string"
              value={name}
              setValue={(x: string) => {
                setButtonStatus("");
                setName(x);
              }}
              placeholder="ex: perspective-vortex"
              width="470px"
              disabled={buttonStatus === "loading"}
            />
          </InputWrapper>
          <NewProjectSaveButton
            text="Create project"
            disabled={buttonStatus === "loading"}
            onClick={createProject}
            status={buttonStatus}
            makeFlush={true}
            clearPosition={true}
            statusPosition="right"
            saveText="Creating project... This may take a minute."
            successText="Project created successfully!"
          />
        </SlideWrapper>
      </>
    );
  };

  return (
    <Wrapper>
      <StyledNewProject>
        <PageIllustration />
        {renderContents()}
      </StyledNewProject>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  max-width: 700px;
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -6%;
  padding-bottom: 5%;
  min-width: 300px;
  position: relative;
`;

const FadeWrapper = styled.div<{ delay?: string }>`
  opacity: 0;
  animation: fadeIn 0.5s ${(props) => props.delay || "0.2s"};
  animation-fill-mode: forwards;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const SlideWrapper = styled.div<{ delay?: string }>`
  opacity: 0;
  animation: slideIn 0.7s 1.3s;
  animation-fill-mode: forwards;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Letter = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  color: white;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
`;

const ProjectImage = styled.img`
  width: 100%;
  height: 100%;
`;

const ProjectIcon = styled.div`
  width: 45px;
  min-width: 45px;
  height: 45px;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
  margin-right: 15px;
  font-weight: 400;
  margin-top: 9px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: -15px;
`;

const Warning = styled.span`
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
  margin-left: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.makeFlush ? "" : "5px"};
`;

const StyledNewProject = styled.div`
  min-width: 300px;
  position: relative;
`;

const NewProjectSaveButton = styled(SaveButton)`
  margin-top: 24px;
`;

const BackButton = styled.div`
  margin-bottom: 24px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;
