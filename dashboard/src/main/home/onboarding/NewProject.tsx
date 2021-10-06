import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import gradient from "assets/gradient.png";
import { isAlphanumeric } from "shared/common";

import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";
import TitleSection from "components/TitleSection";
import { useSnapshot } from "valtio";
import { actions, OnboardingState } from "./OnboardingState";
import { useRouting } from "shared/routing";
import { Context } from "shared/Context";
import api from "shared/api";
import SaveButton from "components/SaveButton";

type ValidationError = {
  hasError: boolean;
  description?: string;
};

export const NewProjectFC = () => {
  const snap = useSnapshot(OnboardingState);
  const { user, setProjects, setCurrentProject } = useContext(Context);
  const { pushFiltered } = useRouting();
  const [buttonStatus, setButtonStatus] = useState("");

  useEffect(() => {
    if (snap.userId !== null) {
      window.analytics.track("provision_new-project", {
        userId: snap.userId,
      });
    }
  }, [snap.userId]);

  const validateProjectName = (): ValidationError => {
    const name = snap.projectName;
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
    const { projectName } = snap;
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

      // Need to set project list for dropdown
      // TODO: consolidate into ProjectSection (case on exists in list on set)
      const projectList = await api
        .getProjects(
          "<token>",
          {},
          {
            id: user.userId,
          }
        )
        .then((res) => res.data);
      setProjects(projectList);
      setCurrentProject(project);

      pushFiltered("/onboarding/provision", []);
      setButtonStatus("success");
    } catch (error) {
      setButtonStatus("Couldn't create project, try again.");
      console.log(error);
    }
  };

  return (
    <>
      <TitleSection>New Project</TitleSection>
      <Helper>
        Project name
        <Warning highlight={validateProjectName().hasError}>
          (lowercase letters, numbers, and "-" only) 25 letters max length
        </Warning>
        <Required>*</Required>
      </Helper>
      <InputWrapper>
        <ProjectIcon>
          <ProjectImage src={gradient} />
          <Letter>
            {snap.projectName ? snap.projectName[0].toUpperCase() : "-"}
          </Letter>
        </ProjectIcon>
        <InputRow
          type="string"
          value={snap.projectName}
          setValue={(x: string) => {
            setButtonStatus("");
            actions.setProjectName(x);
          }}
          placeholder="ex: perspective-vortex"
          width="470px"
        />
      </InputWrapper>
      <NewProjectSaveButton
        text="Create Project"
        disabled={false}
        onClick={createProject}
        status={buttonStatus}
        makeFlush={true}
        clearPosition={true}
        statusPosition="right"
        saveText="Creating project..."
        successText="Project created successfully!"
      />
    </>
  );
};

const NewProjectSaveButton = styled(SaveButton)`
  margin-top: 24px;
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
  background: #00000028;
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
