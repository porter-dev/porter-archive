import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import InvitePage from "./InviteList";
import TabRegion from "components/TabRegion";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import TitleSection from "components/TitleSection";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import { RouteComponentProps, withRouter } from "react-router";
import { getQueryParam } from "shared/routing";
import APITokensSection from "./APITokensSection";
import { RolesAdmin } from "./roles-admin";

type PropsType = RouteComponentProps & WithAuthProps & {};

const isValidTab = (tab: string): tab is AvailableTabs => {
  return [
    "invite",
    "api-tokens",
    "manage-access",
    "billing",
    "additional-settings",
    "roles-admin",
  ].includes(tab);
};

type AvailableTabs =
  | "invite"
  | "api-tokens"
  | "manage-access"
  | "billing"
  | "additional-settings"
  | "roles-admin";

type StateType = {
  projectName: string;
  currentTab: AvailableTabs;
  tabOptions: { value: AvailableTabs; label: string }[];
};

class ProjectSettings extends Component<PropsType, StateType> {
  state = {
    projectName: "",
    currentTab: "manage-access" as StateType["currentTab"],
    tabOptions: [] as StateType["tabOptions"],
  };

  componentDidUpdate(prevProps: PropsType) {
    const selectedTab = getQueryParam(this.props, "selected_tab");

    if (prevProps.location.search !== this.props.location.search) {
      if (selectedTab && isValidTab(selectedTab)) {
        this.setState({ currentTab: selectedTab });
      } else {
        this.setState({ currentTab: "manage-access" });
      }
    }
    if (
      this.context?.hasBillingEnabled &&
      !this.state.tabOptions.find((t) => t.value === "billing")
    ) {
      const tabOptions = this.state.tabOptions;
      this.setState({ tabOptions });
      return;
    }
  }

  componentDidMount() {
    let { currentProject } = this.context;
    this.setState({ projectName: currentProject.name });
    const tabOptions = [] as StateType["tabOptions"];
    tabOptions.push({ value: "manage-access", label: "Manage Access" });
    tabOptions.push({
      value: "billing",
      label: "Billing",
    });

    if (this.props.isAuthorized("settings", "", ["get", "delete"])) {
      if (currentProject?.api_tokens_enabled) {
        tabOptions.push({
          value: "api-tokens",
          label: "API Tokens",
        });
      }

      tabOptions.push({
        value: "additional-settings",
        label: "Additional Settings",
      });
    }

    tabOptions.push({
      value: "roles-admin",
      label: "Roles Admin",
    });

    this.setState({ tabOptions });

    const selectedTab = getQueryParam(this.props, "selected_tab");
    if (selectedTab && isValidTab(selectedTab)) {
      this.setState({ currentTab: selectedTab });
    }
  }

  renderTabContents = () => {
    if (!this.props.isAuthorized("settings", "", ["get", "delete"])) {
      return <InvitePage />;
    }

    switch (this.state.currentTab) {
      case "roles-admin":
        return <RolesAdmin />;
      case "manage-access":
        return <InvitePage />;
      case "api-tokens":
        return <APITokensSection />;
      case "billing":
        return (
          <Placeholder>
            <Helper>
              Visit the{" "}
              <a
                href={`/api/projects/${this.context.currentProject?.id}/billing/redirect`}
              >
                billing portal
              </a>{" "}
              to view plans.
            </Helper>
          </Placeholder>
        );
      case "additional-settings":
      default:
        return (
          <>
            <Heading isAtTop={true}>Delete Project</Heading>
            <Helper>
              Permanently delete this project. This will destroy all clusters
              tied to this project that have been provisioned by Porter. Note
              that this will not delete the image registries provisioned by
              Porter. To delete the registries, please do so manually in your
              cloud console.
            </Helper>

            <Helper>
              Destruction of resources sometimes results in dangling resources.
              To ensure that everything has been properly destroyed, please
              visit your cloud provider's console. Instructions to properly
              delete all resources can be found
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
          setCurrentTab={(x: AvailableTabs) => this.setState({ currentTab: x })}
          options={this.state.tabOptions}
        >
          {this.renderTabContents()}
        </TabRegion>
      </StyledProjectSettings>
    );
  }
}

ProjectSettings.contextType = Context;

export default withRouter(withAuth(ProjectSettings));

const Placeholder = styled.div`
  width: 100%;
  height: 200px;
  background: #ffffff11;
  border-radius: 3px;
  display: flex;
  align-items: center;
  text-align: center;
  padding: 0 30px;
  justify-content: center;
  padding-bottom: 10px;
`;

const Warning = styled.div`
  font-size: 13px;
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
  margin-bottom: 20px;
`;

const StyledProjectSettings = styled.div`
  width: calc(85%);
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
