import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';
import { integrationList } from '../../../shared/common';
import { ChoiceType } from '../../../shared/types';

import IntegrationList from './IntegrationList';
import IntegrationForm from './integration-form/IntegrationForm';

type PropsType = {
};

type StateType = {
  currentCategory: string | null,
  currentIntegration: string | null,
  currentOptions: any[],
  currentIntegrationData: any[],
};

export default class Integrations extends Component<PropsType, StateType> {
  state = {
    currentCategory: null as string | null,
    currentIntegration: null as string | null,
    currentOptions: [] as any[],
    currentIntegrationData: [] as any[],
  }

  // TODO: implement once backend is restructured
  getIntegrations = (categoryType: string) => {
    let { currentProject } = this.context;
    switch (categoryType) {
      case 'kubernetes':
        api.getProjectClusters('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
          if (err) {
            console.log(err);
          } else {
            // console.log(res.data)
          }
        });
        break;
      case 'registry':
        api.getProjectRegistries('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
          if (err) {
            console.log(err);
          } else {
            let currentOptions = [] as string[];
            res.data.forEach((integration: any, i: number) => {
              currentOptions.includes(integration.service) ? null : currentOptions.push(integration.service);
            });
            this.setState({ currentOptions, currentIntegrationData: res.data });
          }
        });
        break;
      case 'repo':
        api.getProjectRepos('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
          if (err) {
            console.log(err);
          } else {
            // console.log(res.data);
          }
        });
        break;
      default:
        console.log('Unknown integration category.');
    }
  }

  componentDidUpdate(prevProps: PropsType, prevState: StateType) {
    if (this.state.currentCategory && this.state.currentCategory !== prevState.currentCategory) {
      this.getIntegrations(this.state.currentCategory);
    }
  }

  renderIntegrationContents = () => {
    if (this.state.currentIntegrationData) {
      let items = this.state.currentIntegrationData.filter(item => item.service === this.state.currentIntegration);
      if (items.length > 0) {
        return (
          <div>
            <Label>Existing Credentials</Label>
            {
              items.map((item: any, i: number) => {
                return (
                  <Credential>
                    <i className="material-icons">admin_panel_settings</i> {item.name}
                  </Credential>
                );
              })
            }
            <br />
          </div>
        );
      }
    }
  }

  renderContents = () => {
    let { currentCategory, currentIntegration } = this.state;

    // TODO: Split integration page into separate component
    if (currentIntegration) {
      let icon = integrationList[currentIntegration] && integrationList[currentIntegration].icon;
      return (
        <div>
          <TitleSectionAlt>
            <Flex>
              <i className="material-icons" onClick={() => this.setState({ currentIntegration: null })}>
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
      let icon = integrationList[currentCategory] && integrationList[currentCategory].icon;
      let label = integrationList[currentCategory] && integrationList[currentCategory].label;
      let buttonText = integrationList[currentCategory] && integrationList[currentCategory].buttonText;
      return (
        <div>
          <TitleSectionAlt>
            <Flex>
              <i className="material-icons" onClick={() => this.setState({ currentCategory: null })}>
                keyboard_backspace
              </i>
              <Icon src={icon && icon} />
              <Title>{label}</Title>
            </Flex>

            <Button 
              onClick={() => this.context.setCurrentModal('IntegrationsModal', { 
                category: currentCategory,
                setCurrentIntegration: (x: string) => this.setState({ currentIntegration: x })
              })}
            >
              <i className="material-icons">add</i>
              {buttonText}
            </Button>
          </TitleSectionAlt>

          <IntegrationList
            integrations={this.state.currentOptions}
            setCurrent={(x: string) => this.setState({ currentIntegration: x })}
          />
        </div>
      );
    }
    return (
      <div>
        <TitleSection>
          <Title>Integrations</Title>
        </TitleSection>

        <IntegrationList
          integrations={['kubernetes', 'registry', 'repo']}
          setCurrent={(x: any) => this.setState({ currentCategory: x })}
          isCategory={true}
        />
      </div>
    );
  }
  
  render() {
    return ( 
      <StyledIntegrations>
        {this.renderContents()}
      </StyledIntegrations>
    );
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

  > img, i {
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
  font-family: 'Work Sans', sans-serif;
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