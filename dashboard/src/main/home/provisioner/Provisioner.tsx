import React, { Component } from 'react';
import styled from 'styled-components';
import posthog from 'posthog-js';

import api from 'shared/api';
import { Context } from 'shared/Context';
import ansiparse from 'shared/ansiparser'
import loading from 'assets/loading.gif';
import warning from 'assets/warning.png';
import { InfraType } from 'shared/types';
import Loading from 'components/Loading';

import Helper from 'components/values-form/Helper';
import InfraStatuses from './InfraStatuses';
import ProvisionerLogs from './ProvisionerLogs'
import { RouteComponentProps, withRouter } from "react-router";
import { Link } from "react-router-dom";

type PropsType = RouteComponentProps & {};

type StateType = {
  error: boolean,
  logs: string[],
  websockets: any[],
  maxStep : Record<string, number>,
  currentStep: Record<string, number>,
  triggerEnd: boolean,
  infras: InfraType[],
  loading: boolean,
  selectedInfra: InfraType,
};

class Provisioner extends Component<PropsType, StateType> {
  state = {
    error: false,
    logs: [] as string[],
    websockets : [] as any[],
    maxStep: {} as Record<string, any>,
    currentStep: {} as Record<string, number>,
    triggerEnd: false,
    infras: [] as InfraType[],
    selectedInfra: null as InfraType,
    loading: true,
  }

  selectInfra = (infra: InfraType) => {
    this.setState({ selectedInfra: infra })
  }

  componentDidMount() {
    let { currentProject } = this.context;

    api.getInfra('<token>', {}, { 
      project_id: currentProject.id 
    }, (err: any, res: any) => {
      if (err) return;
      
      this.setState({ 
        error: false, 
        infras: res.data, 
        loading: false 
      });
    });
  }

  render() {
    if (this.state.loading) {
      return (
        <StyledProvisioner> 
          <Loading />
        </StyledProvisioner>
      )
    }

    if (this.state.infras.length > 0) {
      return (
        <StyledProvisioner>
          <TabWrapper>
            <InfraStatuses 
              infras={this.state.infras} 
              selectInfra={this.selectInfra.bind(this)}
            />
          </TabWrapper>

          <ProvisionerLogs selectedInfra={this.state.selectedInfra} />
        </StyledProvisioner>
      )
    }

    return (
      <StyledProvisioner>
        You have not provisioned any resources for this project through Porter.
      </StyledProvisioner>
    );
  }
}

Provisioner.contextType = Context;

export default withRouter(Provisioner);

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 20px 25px;
`;

const Log = styled.div`
  font-family: monospace;
`;

const LogStream = styled.div`
  height: 300px;
  margin-top: 20px;
  font-size: 13px;
  border: 2px solid #ffffff55;
  border-radius: 10px;
  width: 100%;
  background: #00000022;
  user-select: text;
`;

const StyledProvisioner = styled.div`
  width: 100%;
  height: 350px;
  background: #ffffff11;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  margin-top: 10px;
`;

const TabWrapper = styled.div`
  width: 35%;
  min-width: 250px;
  height: 100%;
  overflow-y: auto;
`;