import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import InvitePage from "./InviteList";
import TabRegion from "components/TabRegion";
import Heading from "components/values-form/Heading";
import Helper from "components/values-form/Helper";
import TitleSection from "components/TitleSection";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

type PropsType = WithAuthProps & {};

type StateType = {
  projectName: string;
  currentTab: string;
  tabOptions: { value: string; label: string }[];
};

class ProjectSettings extends Component<PropsType, StateType> {
  state = {
    projectName: "",
    currentTab: "manage-access",
    tabOptions: [] as { value: string; label: string }[],
  };

  componentDidMount() {
    let { currentProject } = this.context;
    this.setState({ projectName: currentProject.name });
    const tabOptions = [];
    tabOptions.push({ value: "manage-access", label: "Manage Access" });
    if (this.props.isAuthorized("settings", "", ["get", "delete"])) {
      tabOptions.push({
        value: "additional-settings",
        label: "Additional Settings",
      });
    }

    this.setState({ tabOptions });
  }

  renderTabContents = () => {
    if (!this.props.isAuthorized("settings", "", ["get", "delete"])) {
      return <InvitePage />;
    }

    if (this.state.currentTab === "manage-access") {
      return <InvitePage />;
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
            Destruction of resources sometimes results in dangling resources. To
            ensure that everything has been properly destroyed, please visit
            your cloud provider's console. Instructions to properly delete all
            resources can be found
            <a
              target="none"
              href="https://docs.getporter.dev/docs/deleting-dangling-resources"
            >
              {" "}
              here
            </a>
            .
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
        <TitleSection>Project Settings</TitleSection>
        <TabRegion
          currentTab={this.state.currentTab}
          setCurrentTab={(x: string) => this.setState({ currentTab: x })}
          options={this.state.tabOptions}
        >
          {this.renderTabContents()}
        </TabRegion>
      </StyledProjectSettings>
    );
  }
}

ProjectSettings.contextType = Context;

export default withAuth(ProjectSettings);

const Warning = styled.div`
  font-size: 13px;
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
  margin-bottom: 20px;
`;

const StyledProjectSettings = styled.div`
  width: 83%;
  min-width: 300px;
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
