import React, { Component, useContext, useEffect, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import settings from "assets/settings.svg";

import InvitePage from "./InviteList";
import TabRegion from "components/TabRegion";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import { RouteComponentProps, withRouter, WithRouterProps } from "react-router";
import { getQueryParam } from "shared/routing";
import APITokensSection from "./APITokensSection";
import _ from "lodash";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import ProjectDeleteConsent from "./ProjectDeleteConsent";
import Metadata from "./Metadata";
import Button from "components/porter/Button";
import Input from "components/porter/Input";
import { isAlphanumeric } from "shared/common";
import api from "shared/api";
import Error from "components/porter/Error";

type PropsType = RouteComponentProps & WithAuthProps & {};
type ValidationError = {
  hasError: boolean;
  description?: string;
};
type StateType = {
  projectName: string;
  currentTab: string;
  tabOptions: { value: string; label: string }[];
  showCostConfirmModal: boolean;
};

function ProjectSettings(props: any) {
  const context = useContext(Context);

  const [projectName, setProjectName] = useState("");
  const [currentTab, setCurrentTab] = useState("manage-access");
  const [tabOptions, setTabOptions] = useState([]);
  const [showCostConfirmModal, setShowCostConfirmModal] = useState(false);
  const [name, setName] = useState(context?.currentProject?.name);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [buttonStatus, setButtonStatus] = useState<React.ReactNode>("");

  useEffect(() => {
    const selectedTab =
      getQueryParam(props, "selected_tab") || "manage-access";

    if (currentTab !== selectedTab) {
      setCurrentTab(selectedTab);
    }
  }, [props.location.search]);
  useEffect(() => {
    const currentProject = context.currentProject;
    if (projectName !== currentProject.name) {
      setProjectName(currentProject.name);
    }

  }, []);


  useEffect(() => {
    let { currentProject } = context;
    if (projectName !== currentProject.name) {
      setProjectName(currentProject.name);
    }

    const tabOpts = [];
    tabOpts.push({ value: "manage-access", label: "Manage access" });
    // ? Disabled for now https://discord.com/channels/542888846271184896/1059277393031856208/1059277395913351258
    // tabOptions.push({
    //   value: "billing",
    //   label: "Billing",
    // });
    tabOpts.push({ value: "metadata", label: "Metadata" });
    if (props.isAuthorized("settings", "", ["get", "delete"])) {
      // if (this.context?.hasBillingEnabled) {
      //   tabOptions.push({
      //     value: "billing",
      //     label: "Billing",
      //   });
      // }

      if (currentProject?.api_tokens_enabled) {
        tabOpts.push({
          value: "api-tokens",
          label: "API Tokens",
        });
      }

      tabOpts.push({
        value: "additional-settings",
        label: "Additional settings",
      });
    }


    if (!_.isEqual(tabOpts, tabOptions)) {
      setTabOptions(tabOpts);
    }

    const selectedTab = getQueryParam(props, "selected_tab");
    if (selectedTab && selectedTab !== currentTab) {
      setCurrentTab(selectedTab);
    }

  }, [context, projectName, currentTab, props, tabOptions]);

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

  const handleNameChange = async () => {
    try {
      setButtonStatus("loading");

      await api.renameProject(
        "<token>",
        {
          name: name,
        },
        {
          project_id: context.currentProject.id,
        })
      setButtonStatus("success");
      window.location.reload();

    } catch (err) {
      console.log(err)
      setButtonStatus(<Error message="Unable to rename project" />);
    }
  }

  const renderTabContents = () => {
    if (!props.isAuthorized("settings", "", ["get", "delete"])) {
      return <InvitePage />;
    }

    if (currentTab === "manage-access") {
      return <InvitePage />;
    }
    else if (currentTab == "metadata") {
      return <Metadata />
    } else if (currentTab === "api-tokens") {
      return <APITokensSection />;
    } else if (currentTab === "billing") {
      return (
        <Placeholder>
          <Helper>
            Visit the{" "}
            <a
              href={`/api/projects/${context.currentProject?.id}/billing/redirect`}
            >
              billing portal
            </a>{" "}
            to view plans.
          </Helper>
        </Placeholder>
      );
    } else {
      return (
        <>

          <Heading isAtTop={true}>Rename Project</Heading>

          <Helper color={validateProjectName().hasError ? "#f5cb42" : "#aaaabb"}>
            (lowercase letters, numbers, and "-" only)
          </Helper>
          <Input placeholder={"ex: perspective-vortex"} value={name} setValue={setName} width={"500px"}>
          </Input>
          <Spacer y={1} />
          <Button
            onClick={() => {
              handleNameChange()
            }}
            status={buttonStatus}
            loadingText={"Updating..."}
            disabled={validateProjectName().hasError}
          >
            Change name
          </Button>

          <Spacer y={1} />
          <Spacer y={1} />
          <Heading isAtTop={true}>Delete project</Heading>

          <Helper>
            Permanently delete this project. This will destroy all clusters tied
            to this project that have been provisioned by Porter. Note that this
            will not delete the image registries provisioned by Porter. To
            delete the registries, please do so manually in your cloud console.
          </Helper>

          <DeleteButton
            onClick={() => {
              setShowCostConfirmModal(true);
            }}
          >
            Delete project
          </DeleteButton>
          <ProjectDeleteConsent
            setShowCostConfirmModal={setShowCostConfirmModal}
            show={showCostConfirmModal}  // <-- Pass these props
          />
        </>
      );
    }
  };

  return (
    <StyledProjectSettings>
      <DashboardHeader
        image={settings}
        title="Project settings"
        description="Configure access permissions and additional project settings."
        disableLineBreak
      />
      <TabRegion
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        options={tabOptions}
      >
        {renderTabContents()}
      </TabRegion>
    </StyledProjectSettings>
  );
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
    props.highlight ? "#f5cb42" : "#aaaabb"}
  margin-bottom: 20px;
`;

const StyledProjectSettings = styled.div`
  width: 100%;
  min-width: 300px;
  height: 100vh;
`;

const DeleteButton = styled.div`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
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
