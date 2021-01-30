import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../shared/Context';
import { ActionConfigType } from '../../shared/types';
import InputRow from '../values-form/InputRow';

type PropsType = {
  actionConfig: ActionConfigType | null,
  setActionConfig: (x: ActionConfigType) => void,
};

type StateType = {
  dockerRepo: string,
  error: boolean,
};

export default class ActionDetails extends Component<PropsType, StateType> {
  state = {
    dockerRepo: '',
    error: false,
  }

  componentDidMount() {
    if (this.props.actionConfig.dockerfile_path) {
      this.setPath('/Dockerfile');
    } else {
      this.setPath('Dockerfile');
    }
  }

  setPath = (x: string) => {
    let { actionConfig, setActionConfig } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.dockerfile_path = updatedConfig.dockerfile_path.concat(x);
    setActionConfig(updatedConfig);
  }

  setURL = (x: string) => {
    let { actionConfig, setActionConfig } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.image_repo_uri = x;
    setActionConfig(updatedConfig);
  }

  renderConfirmation = () => {
    let { actionConfig } = this.props;
    return (
      <Holder>
        <InputRow
          disabled={true}
          label='Git Repository'
          type='text'
          width='100%'
          value={actionConfig.git_repo}
          setValue={(x: string) => console.log(x)}
        />
        <InputRow
          disabled={true}
          label='Dockerfile Path'
          type='text'
          width='100%'
          value={actionConfig.dockerfile_path}
          setValue={(x: string) => console.log(x)}
        />
        <InputRow
          label='Docker Image Repository'
          placeholder='Image Repo URL (ex. gcr.io/porter/mr-p)'
          type='text'
          width='100%'
          value={actionConfig.image_repo_uri}
          setValue={(x: string) => this.setURL(x)}
        />
      </Holder>
    )
  }

  render() {
    return (
      <div>
        {this.renderConfirmation()}
      </div>
    );
  }
}

ActionDetails.contextType = Context;

const Holder = styled.div`
  padding: 0px 12px;
`;