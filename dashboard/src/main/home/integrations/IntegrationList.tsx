import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import { getRegistryIcon } from '../../../shared/common';
import api from '../../../shared/api';

type PropsType = {
  setCurrentIntegration: (x: any) => void
};

type StateType = {
  integrations: any[]
};

const dummyIntegrations = [
  {
    name: 'docker-hub',
    label: 'Docker Hub',
  },
  {
    name: 'gcr',
    label: 'Google Container Registry (GCR)',
  },
  {
    name: 'ecr',
    label: 'Amazon Elastic Container Registry (ECR)',
  },
];

export default class IntegrationList extends Component<PropsType, StateType> {
  state = {
    integrations: [] as any[]
  }

  componentDidMount() {
    this.setState({ integrations: dummyIntegrations });
  }

  renderContents = () => {
    if (this.state.integrations) {
      return this.state.integrations.map((integration: any, i: number) => {
        let icon = getRegistryIcon(integration.name);
        return (
          <Integration
            key={i}
            onClick={() => this.props.setCurrentIntegration(integration)}
          >
            <Flex>
              <Icon src={icon && icon} />
              <Label>{integration.label}</Label>
            </Flex>
            <i className="material-icons">launch</i>
          </Integration>
        );
      });
    }
    return (
      <Placeholder>
        You haven't set up any integrations yet.
      </Placeholder>
    );
  }
  
  render() {
    return ( 
      <StyledIntegrationList>
        {this.renderContents()}
      </StyledIntegrationList>
    );
  }
}

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Integration = styled.div`
  height: 70px;
  width: calc(100% + 4px);
  margin-left: -2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  cursor: pointer;
  background: #26282f;
  cursor: pointer;
  margin-bottom: 15px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
  :hover {
    background: #ffffff11;
  }

  > i {
    font-size: 18px;
    color: #616feecc;
  }
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 15px;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  justify-content: center;
  margin-top: 30px;
  background: #ffffff11;
  color: #ffffff44;
  border-radius: 5px;
`;

const StyledIntegrationList = styled.div`
  margin-top: 20px;
`;