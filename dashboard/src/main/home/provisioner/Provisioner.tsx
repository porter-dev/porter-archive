import React, { Component } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import { InfraType, ProjectType } from "shared/types";
import Loading from "components/Loading";

import InfraStatuses from "./InfraStatuses";
import ProvisionerLogs from "./ProvisionerLogs";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {};

type StateType = {
  error: boolean;
  logs: string[];
  websockets: any[];
  maxStep: Record<string, number>;
  currentStep: Record<string, number>;
  triggerEnd: boolean;
  infras: InfraType[];
  loading: boolean;
  selectedInfra: InfraType;
  currentProject: ProjectType;
};

class Provisioner extends Component<PropsType, StateType> {
  state = {
    error: false,
    logs: [] as string[],
    websockets: [] as any[],
    maxStep: {} as Record<string, any>,
    currentStep: {} as Record<string, number>,
    triggerEnd: false,
    infras: [] as InfraType[],
    selectedInfra: null as InfraType,
    loading: true,
    currentProject: this.context.currentProject
  };

  selectInfra = (infra: InfraType) => {
    this.setState({ selectedInfra: infra });
  };

  componentDidMount() {
    let { currentProject } = this.state;

    api
      .getInfra(
        "<token>",
        {},
        {
          project_id: currentProject.id
        }
      )
      .then(res => {
        let infras = res.data.sort((a: InfraType, b: InfraType) => {
          return b.id - a.id;
        });

        this.setState({
          error: false,
          infras,
          loading: false,
          selectedInfra: infras[0]
        });
      })
      .catch();
  }

  render() {
    if (this.state.loading) {
      return (
        <StyledProvisioner>
          <Loading />
        </StyledProvisioner>
      );
    }

    if (this.state.infras.length > 0) {
      return (
        <StyledProvisioner>
          <TabWrapper>
            <InfraStatuses
              infras={this.state.infras}
              selectInfra={this.selectInfra.bind(this)}
              selectedInfra={this.state.selectedInfra}
            />
          </TabWrapper>

          <ProvisionerLogs
            key={this.state.selectedInfra?.id}
            selectedInfra={this.state.selectedInfra}
          />
        </StyledProvisioner>
      );
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

const StyledProvisioner = styled.div`
  width: 100%;
  height: 350px;
  background: #ffffff11;
  color: #aaaabb;
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
