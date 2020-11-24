import React, { Component } from 'react';
import styled from 'styled-components';

import DockerHubForm from './DockerHubForm';
import GKEForm from './GKEForm';
import EKSForm from './EKSForm';
import GCRForm from './GCRForm';
import ECRForm from './ECRForm';

type PropsType = {
  integrationName: string
};

type StateType = {
};

export default class IntegrationForm extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    switch (this.props.integrationName) {
      case 'docker-hub':
        return <DockerHubForm />;
      case 'gke':
        return <GKEForm />;
      case 'eks':
        return <EKSForm />;
      case 'ecr':
        return <ECRForm />;
      case 'gcr':
        return <GCRForm />;
      default:
        return null;
    }
  }
}