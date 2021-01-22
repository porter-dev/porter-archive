import React, { Component } from 'react';
import styled from 'styled-components';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { ProjectType } from '../../../shared/types';

import ProvisionerStatus from './ProvisionerStatus';

type PropsType = {
  setCurrentView: (x: string) => void,
  handleDO: boolean,
  setHandleDO: (x: boolean) => void,
  currentProject: ProjectType,
}

type StateType = {
};

export default class ProvisionerContainer extends Component<PropsType, StateType> {
  state = {
  }

  provisionDOCR = (integrationId: number, tier: string) => {
    api.createDOCR('<token>', {
      do_integration_id: integrationId,
      docr_name: this.props.currentProject.name,
      docr_subscription_tier: tier,
    }, { 
      project_id: this.props.currentProject.id
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log(res.data);
    });
  }

  checkDO = () => {
    let { currentProject } = this.props;
    if (this.props.handleDO && currentProject?.id) {
      api.getOAuthIds('<token>', {}, { 
        project_id: currentProject.id
      }, (err: any, res: any) => {
        if (err) {
          console.log(err);
          return;
        }
        let tgtIntegration = res.data.find((integration: any) => {
          return integration.client === 'do'
        });
        let queryString = window.location.search;
        let urlParams = new URLSearchParams(queryString);
        let tier = urlParams.get('tier');
        let region = urlParams.get('region');
        let infras = urlParams.getAll('infras');
        console.log(infras, 'oof');
        // this.provisionDOCR(tgtIntegration.id, tier);
      });
      this.props.setHandleDO(false);
    }
  }

  componentDidMount() {
    this.checkDO();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.currentProject?.id !== this.props.currentProject?.id) {
      this.checkDO();
    }
  }

  render() {
    return (
      <ProvisionerStatus setCurrentView={this.props.setCurrentView} />
    );
  }
}

ProvisionerStatus.contextType = Context;