import React, { Component } from 'react';
import styled from 'styled-components';

import loadingDots from '../../../assets/loading-dots.gif';
import { InfraType } from '../../../shared/types';
import { infraNames } from '../../../shared/common';

type PropsType = {
  infras: InfraType[],
};

type StateType = {
};

export default class InfraStatuses extends Component<PropsType, StateType> {
  state = {
  }

  renderStatusIcon = (status: string) => {
    if (status === 'created') {
      return <StatusIcon>✓</StatusIcon>;
    } else if (status === 'creating') {
      return <StatusIcon><img src={loadingDots} /></StatusIcon>
    } else if (status === 'error') {
      return <StatusIcon color='#e3366d'>✗</StatusIcon>
    }
  }

  render() {
    return (
      <StyledInfraStatuses>
        {this.props.infras.map((infra: InfraType, i: number) => {
          return (
            <InfraRow key={infra.id}>
              {this.renderStatusIcon(infra.status)}
              {infraNames[infra.kind]}
            </InfraRow>
          )
        })}
      </StyledInfraStatuses>
    );
  }
}

const StatusIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  font-size: 16px;
  color: ${props => props.color ? props.color : '#68c49c'};
  margin-right: 10px;
`;

const InfraRow = styled.div`
  width: 100%;
  height: 25px;
  padding-left: 2px;
  margin-top: 10px;
  font-size: 13px;
  color: #aaaabb;
  display: flex;
  align-items: center;
`;

const StyledInfraStatuses = styled.div`
  margin-top: 20px;
  margin-bottom: 0;
`;