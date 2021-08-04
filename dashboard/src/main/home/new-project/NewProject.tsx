import React, { Component } from "react";
import styled from "styled-components";

import gradient from "assets/gradient.png";
import { Context } from "shared/Context";
import { isAlphanumeric } from "shared/common";

import InputRow from "components/values-form/InputRow";
import Helper from "components/values-form/Helper";
import ProvisionerSettings from "../provisioner/ProvisionerSettings";
import TitleSection from "components/TitleSection";

type PropsType = {};

type StateType = {
  projectName: string;
  selectedProvider: string | null;
};

export default class NewProject extends Component<PropsType, StateType> {
  state = {
    projectName: "",
    selectedProvider: null as string | null,
  };

  render() {
    let { capabilities } = this.context;
    let { projectName } = this.state;
    return (
      <StyledNewProject>
        <TitleSection>New Project</TitleSection>
        <Helper>
          Project name
          <Warning
            highlight={
              !isAlphanumeric(this.state.projectName) &&
              this.state.projectName !== ""
            }
          >
            (lowercase letters, numbers, and "-" only)
          </Warning>
          <Required>*</Required>
        </Helper>
        <InputWrapper>
          <ProjectIcon>
            <ProjectImage src={gradient} />
            <Letter>
              {this.state.projectName
                ? this.state.projectName[0].toUpperCase()
                : "-"}
            </Letter>
          </ProjectIcon>
          <InputRow
            type="string"
            value={this.state.projectName}
            setValue={(x: string) => this.setState({ projectName: x })}
            placeholder="ex: perspective-vortex"
            width="470px"
          />
        </InputWrapper>
        <ProvisionerSettings
          isInNewProject={true}
          projectName={projectName}
          provisioner={capabilities?.provisioner}
        />
        <Br />
      </StyledNewProject>
    );
  }
}

NewProject.contextType = Context;

const Br = styled.div`
  width: 100%;
  height: 100px;
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

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledNewProject = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  position: relative;
  margin-top: calc(50vh - 340px);
`;
