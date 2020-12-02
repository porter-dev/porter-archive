import React, { Component } from 'react';
import styled from 'styled-components';

import DockerHubForm from './DockerHubForm';
import GKEForm from './GKEForm';
import EKSForm from './EKSForm';
import GCRForm from './GCRForm';
import ECRForm from './ECRForm';

type PropsType = {
  integrationName: string,
  closeForm: () => void,
};

type StateType = {
};

export default class IntegrationForm extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    let { closeForm } = this.props;
    switch (this.props.integrationName) {
      case 'docker-hub':
        return <DockerHubForm closeForm={closeForm} />;
      case 'gke':
        return <GKEForm closeForm={closeForm} />;
      case 'eks':
        return <EKSForm closeForm={closeForm} />;
      case 'ecr':
        return <ECRForm closeForm={closeForm} />;
      case 'gcr':
        return <GCRForm closeForm={closeForm} />;
      default:
        return null;
    }
  }
}