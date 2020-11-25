import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import { getIntegrationIcon } from '../../../shared/common';
import api from '../../../shared/api';

type PropsType = {
  setCurrent: (x: any) => void,
  integrations: any,
  isCategory?: boolean
};

type StateType = {
};

export default class IntegrationList extends Component<PropsType, StateType> {
  renderContents = () => {
    let { integrations, setCurrent, isCategory } = this.props;
    if (integrations) {
      return integrations.map((integration: any, i: number) => {
        let icon = getIntegrationIcon(integration.value);
        let disabled = integration.value === 'repo';
        return (
          <Integration
            key={i}
            onClick={() => disabled ? null : setCurrent(integration)}
            isCategory={isCategory}
            disabled={disabled}
          >
            <Flex>
              <Icon src={icon && icon} />
              <Label>{integration.label}</Label>
            </Flex>
            <i className="material-icons">{isCategory ? 'launch' : 'more_vert'}</i>
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
  background: #26282f;
  cursor: ${(props: { isCategory: boolean, disabled: boolean }) => props.disabled ? 'not-allowed' : 'pointer'};
  margin-bottom: 15px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
  :hover {
    background: ${(props: { isCategory: boolean, disabled: boolean }) => props.disabled ? '' : '#ffffff11'};

    > i {
      background: ${(props: { isCategory: boolean, disabled: boolean }) => props.disabled ? '' : '#ffffff11'};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: ${(props: { isCategory: boolean, disabled: boolean }) => props.isCategory ? '#616feecc' : '#ffffff44'};
    margin-right: -7px;
  }
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 18px;
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