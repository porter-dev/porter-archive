import React, { Component } from "react";
import styled from "styled-components";
import GHIcon from "assets/GithubIcon";

import { Context } from "shared/Context";
import { integrationList } from "shared/common";
import { RouteComponentProps, withRouter } from "react-router";
import IntegrationList from "./IntegrationList";
import api from "shared/api";
import { pushFiltered } from "shared/routing";
import TitleSection from "components/TitleSection";

type PropsType = RouteComponentProps & {
  category: string;
};

type StateType = {
  // currentIntegration: string | null;
  currentOptions: any[];
  currentTitles: any[];
  currentIds: any[];
  currentIntegrationData: any[];
};

class IntegrationCategories extends Component<PropsType, StateType> {
  state = {
    currentOptions: [] as any[],
    currentTitles: [] as any[],
    currentIds: [] as any[],
    currentIntegrationData: [] as any[],
  };

  componentDidMount() {
    this.getIntegrationsForCategory(this.props.category);
  }

  componentDidUpdate(prevProps: PropsType, prevState: StateType) {
    if (this.props.category != prevProps.category) {
      this.getIntegrationsForCategory(this.props.category);
    }
  }

  getIntegrationsForCategory = (categoryType: string) => {
    const { currentProject } = this.context;
    this.setState({
      currentOptions: [],
      currentTitles: [],
      currentIntegrationData: [],
    });
    switch (categoryType) {
      case "kubernetes":
        api
          .getProjectClusters("<token>", {}, { id: currentProject.id })
          .then()
          .catch(console.log);
        break;
      case "registry":
        api
          .getProjectRegistries("<token>", {}, { id: currentProject.id })
          .then((res) => {
            // Sort res.data into service type and sort each service's registry alphabetically
            let grouped: any = {};
            let final: any = [];
            for (let i = 0; i < res.data.length; i++) {
              let p = res.data[i].service;
              if (!grouped[p]) {
                grouped[p] = [];
              }
              grouped[p].push(res.data[i]);
            }
            Object.values(grouped).forEach((val: any) => {
              final = final.concat(
                val.sort((a: any, b: any) => (a.name > b.name ? 1 : -1))
              );
            });

            let currentOptions = [] as string[];
            let currentTitles = [] as string[];
            final.forEach((integration: any, i: number) => {
              currentOptions.push(integration.service);
              currentTitles.push(integration.name);
            });
            this.setState({
              currentOptions,
              currentTitles,
              currentIntegrationData: final,
            });
          })
          .catch(console.log);
        break;
      case "repo":
        api
          .getGitRepos("<token>", {}, { project_id: currentProject.id })
          .then((res) => {
            let currentOptions = [] as string[];
            let currentTitles = [] as string[];
            let currentIds = [] as any[];
            res.data.forEach((item: any) => {
              currentOptions.push(item.service);
              currentTitles.push(item.repo_entity);
              currentIds.push(item.id);
            });
            this.setState({
              currentOptions,
              currentTitles,
              currentIds,
              currentIntegrationData: res.data,
            });
          })
          .catch(console.log);
        break;
      default:
        console.log("Unknown integration category.");
    }
  };

  render = () => {
    const { category: currentCategory } = this.props;
    let icon =
      integrationList[currentCategory] && integrationList[currentCategory].icon;
    let label =
      integrationList[currentCategory] &&
      integrationList[currentCategory].label;
    let buttonText =
      integrationList[currentCategory] &&
      integrationList[currentCategory].buttonText;
    if (currentCategory !== "repo") {
      return (
        <>
          <Flex>
            <TitleSection
              handleNavBack={() =>
                pushFiltered(this.props, "/integrations", ["project_id"])
              }
              icon={icon}
            >
              {label}
            </TitleSection>
            <Button
              onClick={() =>
                this.context.setCurrentModal("IntegrationsModal", {
                  category: currentCategory,
                  setCurrentIntegration: (x: string) =>
                    pushFiltered(
                      this.props,
                      `/integrations/${this.props.category}/create/${x}`,
                      ["project_id"]
                    ),
                })
              }
            >
              <i className="material-icons">add</i>
              {buttonText}
            </Button>
          </Flex>

          <IntegrationList
            currentCategory={currentCategory}
            integrations={this.state.currentOptions}
            titles={this.state.currentTitles}
            itemIdentifier={this.state.currentIntegrationData}
            updateIntegrationList={() =>
              this.getIntegrationsForCategory(this.props.category)
            }
          />
        </>
      );
    } else {
      return (
        <>
          <Flex>
            <TitleSection
              handleNavBack={() =>
                pushFiltered(this.props, "/integrations", ["project_id"])
              }
              icon={icon}
            >
              {label}
            </TitleSection>
            <Button
              onClick={() =>
                window.open(
                  `/api/oauth/projects/${this.context.currentProject.id}/github`
                )
              }
            >
              <GHIcon />
              {buttonText}
            </Button>
          </Flex>

          <IntegrationList
            currentCategory={currentCategory}
            integrations={this.state.currentOptions}
            titles={this.state.currentTitles}
            itemIdentifier={this.state.currentIds}
            updateIntegrationList={() =>
              this.getIntegrationsForCategory(this.props.category)
            }
          />
        </>
      );
    }
  };
}

IntegrationCategories.contextType = Context;

export default withRouter(IntegrationCategories);

const Icon = styled.img`
  width: 27px;
  margin-right: 12px;
  margin-bottom: -1px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: -20px;
  justify-content: space-between;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    padding: 3px;
    margin-right: 11px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Button = styled.div`
  height: 100%;
  margin-top: -12px;
  background: #616feecc;
  :hover {
    background: #505edddd;
  }
  color: white;
  font-weight: 500;
  font-size: 13px;
  padding: 10px 15px;
  border-radius: 3px;
  cursor: pointer;
  box-shadow: 0 5px 8px 0px #00000010;
  display: flex;
  flex-direction: row;
  align-items: center;

  > img,
  i {
    width: 20px;
    height: 20px;
    font-size: 16px;
    display: flex;
    align-items: center;
    margin-right: 10px;
    justify-content: center;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 18px 0px 24px;
`;
