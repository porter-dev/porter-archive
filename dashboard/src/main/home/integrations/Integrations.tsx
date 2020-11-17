import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';
import { getRegistryIcon } from '../../../shared/common';

import IntegrationList from './IntegrationList';
import DockerHubForm from './integration-forms/DockerHubForm';

type PropsType = {
};

type StateType = {
  currentIntegration: null | any
};

export default class Integrations extends Component<PropsType, StateType> {
  state = {
    currentIntegration: null as null | any,
  }

  renderContents = () => {
    let { currentIntegration } = this.state;
    if (currentIntegration) {
      let icon = getRegistryIcon(currentIntegration.name);
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

          <DockerHubForm />
        </div>
      );
    }
    return (
      <div>
        <TitleSection>
          <Title>Integrations</Title>
          <Button onClick={() => this.context.setCurrentModal('IntegrationsModal', {})}>
            <i className="material-icons">add</i>
            Add Integration
          </Button>
        </TitleSection>

        <IntegrationList
          setCurrentIntegration={(x: any) => this.setState({ currentIntegration: x })}
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