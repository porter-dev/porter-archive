import React, { useEffect } from "react";
import styled from "styled-components";

import gradient from "assets/gradient.png";
import { isAlphanumeric } from "shared/common";

import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";
import TitleSection from "components/TitleSection";
import { useSnapshot } from "valtio";
import { actions, OnboardingState } from "./OnboardingState";
import { useRouting } from "shared/routing";

export const NewProjectFC = () => {
  const snap = useSnapshot(OnboardingState);
  const { pushFiltered } = useRouting();
  useEffect(() => {
    if (snap.userId !== null) {
      window.analytics.track("provision_new-project", {
        userId: snap.userId,
      });
    }
  }, [snap.userId]);

  return (
    <>
      <TitleSection>New Project</TitleSection>
      <Helper>
        Project name
        <Warning
          highlight={
            !isAlphanumeric(snap.projectName) && snap.projectName !== ""
          }
        >
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
          setValue={(x: string) => actions.setProjectName(x)}
          placeholder="ex: perspective-vortex"
          width="470px"
          maxLength={25}
        />
      </InputWrapper>
      <NextButton
        disabled={false}
        onClick={() => {
          pushFiltered("/onboarding/provision", []);
        }}
      >
        Create Project
      </NextButton>
    </>
  );
};

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

const NextButton = styled.button<{ disabled: boolean }>`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 15px;
  margin-top: 13px;
  text-align: left;
  float: left;
  margin-left: 0;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? "#616FEEcc" : "#aaaabb")};
  box-shadow: ${(props) =>
    !props.disabled ? "0 2px 5px 0 #00000030" : "none"};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
  margin-bottom: 10px;
`;
