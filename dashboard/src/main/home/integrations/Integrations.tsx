import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { integrationList } from "shared/common";

import IntegrationList from "./IntegrationList";
import IntegrationForm from "./integration-form/IntegrationForm";

import GHIcon from "assets/GithubIcon";

type PropsType = {};

type StateType = {
  currentCategory: string | null;
  currentIntegration: string | null;
  currentOptions: any[];
  currentTitles: any[];
  currentIds: any[];
  currentIntegrationData: any[];
};

export default class Integrations extends Component<PropsType, StateType> {
  state = {
    currentCategory: null as string | null,
    currentIntegration: null as string | null,
    currentOptions: [] as any[],
    currentTitles: [] as any[],
    currentIds: [] as any[],
    currentIntegrationData: [] as any[],
  };

  // TODO: implement once backend is restructured
  getIntegrations = (categoryType: string) => {
    let { currentProject } = this.context;
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
              currentIntegrationData: res.data,
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

  componentDidUpdate(prevProps: PropsType, prevState: StateType) {
    if (
      this.state.currentCategory &&
      this.state.currentCategory !== prevState.currentCategory
    ) {
      this.getIntegrations(this.state.currentCategory);
    }
  }

  renderIntegrationContents = () => {
    if (this.state.currentIntegrationData) {
      let items = this.state.currentIntegrationData.filter(
        (item) => item.service === this.state.currentIntegration
      );
      if (items.length > 0) {
        return (
          <div>
            <Label>Existing Credentials</Label>
            {items.map((item: any, i: number) => {
              return (
                <Credential key={i}>
                  <i className="material-icons">admin_panel_settings</i>{" "}
                  {item.name}
                </Credential>
              );
            })}
            <br />
          </div>
        );
      }
    }
  };

  renderContents = () => {
    let { currentProject } = this.context;
    let { currentCategory, currentIntegration } = this.state;

    // TODO: Split integration page into separate component
    if (currentIntegration) {
      let icon =
        integrationList[currentIntegration] &&
        integrationList[currentIntegration].icon;
      return (
        <div>
          <TitleSectionAlt>
            <Flex>
              <i
                className="material-icons"
                onClick={() => this.setState({ currentIntegration: null })}
              >
                keyboard_backspace
              </i>
              <Icon src={icon && icon} />
              <Title>{integrationList[currentIntegration].label}</Title>
            </Flex>
          </TitleSectionAlt>
          {this.renderIntegrationContents()}
          <IntegrationForm
            integrationName={currentIntegration}
            closeForm={() => {
              this.setState({ currentIntegration: null });
              this.getIntegrations(this.state.currentCategory);
            }}
          />
          <Br />
        </div>
      );
    } else if (currentCategory) {
      let icon =
        integrationList[currentCategory] &&
        integrationList[currentCategory].icon;
      let label =
        integrationList[currentCategory] &&
        integrationList[currentCategory].label;
      let buttonText =
        integrationList[currentCategory] &&
        integrationList[currentCategory].buttonText;
      if (currentCategory !== "repo") {
        return (
          <div>
            <TitleSectionAlt>
              <Flex>
                <i
                  className="material-icons"
                  onClick={() => this.setState({ currentCategory: null })}
                >
                  keyboard_backspace
                </i>
                <Icon src={icon && icon} />
                <Title>{label}</Title>
              </Flex>
              <Button
                onClick={() =>
                  this.context.setCurrentModal("IntegrationsModal", {
                    category: currentCategory,
                    setCurrentIntegration: (x: string) =>
                      this.setState({ currentIntegration: x }),
                  })
                }
              >
                <i className="material-icons">add</i>
                {buttonText}
              </Button>
            </TitleSectionAlt>

            <LineBreak />

            <IntegrationList
              currentCategory={currentCategory}
              integrations={this.state.currentOptions}
              titles={this.state.currentTitles}
              setCurrent={(x: string) =>
                this.setState({ currentIntegration: x })
              }
              itemIdentifier={this.state.currentIntegrationData}
            />
          </div>
        );
      } else {
        return (
          <div>
            <TitleSectionAlt>
              <Flex>
                <i
                  className="material-icons"
                  onClick={() => this.setState({ currentCategory: null })}
                >
                  keyboard_backspace
                </i>
                <Icon src={icon && icon} />
                <Title>{label}</Title>
              </Flex>
              <Button
                onClick={() =>
                  window.open(`/api/oauth/projects/${currentProject.id}/github`)
                }
              >
                <GHIcon />
                {buttonText}
              </Button>
            </TitleSectionAlt>

            <LineBreak />

            <IntegrationList
              currentCategory={currentCategory}
              integrations={this.state.currentOptions}
              titles={this.state.currentTitles}
              setCurrent={(x: string) =>
                this.setState({ currentIntegration: x })
              }
              itemIdentifier={this.state.currentIds}
            />
          </div>
        );
      }
    }
    return (
      <div>
        <TitleSection>
          <Title>Integrations</Title>
        </TitleSection>

        <IntegrationList
          currentCategory={""}
          integrations={["kubernetes", "registry", "repo"]}
          setCurrent={(x: any) => this.setState({ currentCategory: x })}
          isCategory={true}
        />
      </div>
    );
  };

  render() {
    return <StyledIntegrations>{this.renderContents()}</StyledIntegrations>;
  }
}

Integrations.contextType = Context;

const Label = styled.div`
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 20px;
`;

const Credential = styled.div`
  width: 100%;
  height: 30px;
  font-size: 13px;
  display: flex;
  align-items: center;
  padding: 20px;
  padding-left: 13px;
  width: 100%;
  border-radius: 5px;
  background: #ffffff11;
  margin-bottom: 5px;

  > i {
    font-size: 22px;
    color: #ffffff44;
    margin-right: 10px;
  }
`;

const Br = styled.div`
  width: 100%;
  height: 150px;
`;

const Icon = styled.img`
  width: 27px;
  margin-right: 12px;
  margin-bottom: -1px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;

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
  justify-content: space-between;
  height: 40px;
`;

const TitleSectionAlt = styled(TitleSection)`
  margin-left: -42px;
  width: calc(100% + 42px);
`;

const StyledIntegrations = styled.div`
  width: calc(90% - 150px);
  min-width: 300px;
  padding-top: 45px;
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 32px 0px 24px;
`;
