import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';
import { getIntegrationIcon } from '../../../shared/common';
import { ChoiceType } from '../../../shared/types';

import IntegrationList from './IntegrationList';
import IntegrationForm from './integration-form/IntegrationForm';

type PropsType = {
};

type StateType = {
  currentCategory: ChoiceType | null,
  currentIntegration: any | null,
  currentOptions: any[],
};

const categories = [
  {
    value: 'kubernetes',
    label: 'Kubernetes',
    buttonText: 'Add a Cluster',
  },
  {
    value: 'registry',
    label: 'Docker Registry',
    buttonText: 'Add a Registry',
  },
  {
    value: 'repo',
    label: 'Git Repository',
    buttonText: 'Add a Repository',
  },
];

export default class Integrations extends Component<PropsType, StateType> {
  state = {
    currentCategory: null as any | null,
    currentIntegration: null as any | null,
    currentOptions: [] as any[],
  }

  getIntegrations = (categoryType: string): any[] => {
    switch (categoryType) {
      case 'kubernetes':
        return [
          {
            value: 'gke',
            label: 'Google Kubernetes Engine (GKE)',
          },
          {
            value: 'eks',
            label: 'Amazon Elastic Kubernetes Service (EKS)',
          },
        ];
      case 'registry':
        return [
          {
            value: 'gcr',
            label: 'Google Container Registry (GCR)',
          },
          {
            value: 'ecr',
            label: 'Elastic Container Registry (ECR)',
          },
          {
            value: 'docker-hub',
            label: 'Docker Hub',
          },
        ];
      default:
        return [];
    }
  }

  componentDidUpdate(prevProps: PropsType, prevState: StateType) {
    if (this.state.currentCategory && this.state.currentCategory !== prevState.currentCategory) {
      this.setState({ currentOptions: this.getIntegrations(this.state.currentCategory.value) });
    }
  }

  renderContents = () => {
    let { currentCategory, currentIntegration } = this.state;

    if (currentIntegration) {
      let icon = getIntegrationIcon(currentIntegration.value);
      return (
        <div>
          <TitleSectionAlt>
            <Flex>
              <i className="material-icons" onClick={() => this.setState({ currentIntegration: null })}>
                keyboard_backspace
              </i>
              <Icon src={icon && icon} />
              <Title>{currentIntegration.label}</Title>
            </Flex>
          </TitleSectionAlt>

          <IntegrationForm integrationName={currentIntegration.value} />
          <Br />
        </div>
      );
    } else if (currentCategory) {
      let icon = getIntegrationIcon(currentCategory.value);
      return (
        <div>
          <TitleSectionAlt>
            <Flex>
              <i className="material-icons" onClick={() => this.setState({ currentCategory: null })}>
                keyboard_backspace
              </i>
              <Icon src={icon && icon} />
              <Title>{currentCategory.label}</Title>
            </Flex>

            <Button 
              onClick={() => this.context.setCurrentModal('IntegrationsModal', { 
                integrations: this.state.currentOptions,
                setCurrentIntegration: (x: any) => this.setState({ currentIntegration: x })
              })}
            >
              <i className="material-icons">add</i>
              {currentCategory.buttonText}
            </Button>
          </TitleSectionAlt>

          <IntegrationList
            integrations={this.state.currentOptions}
            setCurrent={(x: any) => this.setState({ currentIntegration: x })}
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
          integrations={categories}
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