import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import InviteList from "./InviteList";
import TabRegion from "components/TabRegion";
import Heading from "components/values-form/Heading";
import Helper from "components/values-form/Helper";

type PropsType = {};

type StateType = {
  projectName: string;
  currentTab: string;
};

const tabOptions = [
  { value: "manage-access", label: "Manage Access" },
  { value: "additional-settings", label: "Additional Settings" },
];

export default class ProjectSettings extends Component<PropsType, StateType> {
  state = {
    projectName: "",
    currentTab: "manage-access",
  };

  componentDidMount() {
    let { currentProject } = this.context;
    this.setState({ projectName: currentProject.name });
  }

  renderTabContents = () => {
    if (this.state.currentTab === "manage-access") {
      return <InviteList />;
    } else {
      return (
        <>
          <Heading isAtTop={true}>Delete Project</Heading>
          <Helper>
            Permanently delete this project. This will destroy all clusters tied
            to this project that have been provisioned by Porter. Note that this
            will not delete the image registries provisioned by Porter. To
            delete the registries, please do so manually in your cloud console.
          </Helper>

          <Helper>
            Destruction of resources sometimes results in dangling resources. To ensure
            that everything has been properly destroyed, please visit your cloud provider's console.
            Instructions to properly delete all resources can be found  
            <a target="none" href="https://docs.getporter.dev/docs/deleting-dangling-resources"> here</a>.
          </Helper>

          <Warning highlight={true}>This action cannot be undone.</Warning>

          <DeleteButton
            onClick={() => {
              this.context.setCurrentModal("UpdateProjectModal", {
                currentProject: this.context.currentProject,
              });
            }}
          >
            Delete Project
          </DeleteButton>
        </>
      );
    }
  };

  render() {
    return (
      <StyledProjectSettings>
        <TitleSection>
          <Title>Project Settings</Title>
        </TitleSection>
        <TabRegion
          currentTab={this.state.currentTab}
          setCurrentTab={(x: string) => this.setState({ currentTab: x })}
          options={tabOptions}
        >
          {this.renderTabContents()}
        </TabRegion>
      </StyledProjectSettings>
    );
  }
}

ProjectSettings.contextType = Context;

const Warning = styled.div`
  font-size: 13px;
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
  margin-bottom: 20px;
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
  margin-bottom: 13px;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 40px;
`;

const StyledProjectSettings = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  padding-top: 70px;
  height: 100vh;
`;

const DeleteButton = styled.div`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 15px;
  margin-top: 10px;
  text-align: left;
  background: red;
  float: left;
  margin-left: 0;
  justify-content: center;
  border-radius: 5px;
  box-shadow: 0 2px 5px 0 #00000030;
  cursor: pointer;
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: brightness(120%);
  }
  background: #b91133;
  border: none;
  :hover {
    filter: brightness(120%);
  }
`;
