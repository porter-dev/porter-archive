import React, { Component } from "react";
import styled from "styled-components";

import gradient from "assets/gradient.jpg";
import { Context } from "shared/Context";
import { isAlphanumeric } from "shared/common";

import InputRow from "components/values-form/InputRow";
import Helper from "components/values-form/Helper";
import ProvisionerSettings from "../provisioner/ProvisionerSettings";

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
    let { projectName } = this.state;
    return (
      <StyledNewProject>
        <TitleSection>
          <Title>New Project</Title>
        </TitleSection>
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
        <ProvisionerSettings isInNewProject={true} projectName={projectName} />
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

const Link = styled.a`
  cursor: pointer;
  margin-left: 5px;
`;

const GuideButton = styled.a`
  display: flex;
  align-items: center;
  margin-left: 20px;
  color: #aaaabb;
  font-size: 13px;
  margin-bottom: -1px;
  border: 1px solid #aaaabb;
  padding: 5px 10px;
  padding-left: 6px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    color: #ffffff;
    border: 1px solid #ffffff;

    > i {
      color: #ffffff;
    }
  }

  > i {
    color: #aaaabb;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const Flex = styled.div`
  display: flex;
  height: 170px;
  width: 100%;
  margin-top: -10px;
  color: #ffffff;
  align-items: center;
  justify-content: center;
`;

const BlockOverlay = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background: #00000055;
  top: 0;
  left: 0;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const DarkMatter = styled.div`
  margin-top: -30px;
`;

const FormSection = styled.div`
  background: #ffffff11;
  margin-top: 25px;
  margin-bottom: 27px;
  background: #26282f;
  border-radius: 5px;
  min-height: 170px;
  padding: 25px;
  padding-bottom: 15px;
  font-size: 13px;
  animation: fadeIn 0.3s 0s;
  position: relative;
`;

const Placeholder = styled.div`
  background: #ffffff11;
  margin-top: 25px;
  margin-bottom: 27px;
  background: #26282f;
  border-radius: 5px;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 13px;
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Highlight = styled.div`
  margin-left: 5px;
  color: #8590ff;
  cursor: pointer;
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
  margin-top: 17px;
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

const Icon = styled.img`
  height: 42px;
  margin-top: 30px;
  margin-bottom: 15px;
  filter: ${(props: { bw?: boolean }) => (props.bw ? "grayscale(1)" : "")};
`;

const BlockDescription = styled.div`
  margin-bottom: 12px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  font-size: 13px;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const BlockTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Block = styled.div`
  align-items: center;
  user-select: none;
  border-radius: 5px;
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 170px;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "" : "pointer"};
  color: #ffffff;
  position: relative;
  background: #26282f;
  box-shadow: 0 3px 5px 0px #00000022;
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ShinyBlock = styled(Block)`
  background: linear-gradient(
    36deg,
    rgba(240, 106, 40, 0.9) 0%,
    rgba(229, 83, 229, 0.9) 100%
  );
  :hover {
    background: linear-gradient(
      36deg,
      rgba(240, 106, 40, 1) 0%,
      rgba(229, 83, 229, 1) 100%
    );
  }
`;

const BlockList = styled.div`
  overflow: visible;
  margin-top: 25px;
  margin-bottom: 27px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 18px;
      margin-left: 18px;
      color: #858faaaa;
      cursor: pointer;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const StyledNewProject = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  position: relative;
  padding-top: 50px;
  margin-top: calc(50vh - 340px);
`;
