import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import InputRow from '../../../../components/values-form/InputRow';
import TextArea from '../../../../components/values-form/TextArea';
import SaveButton from '../../../../components/SaveButton';
import Heading from '../../../../components/values-form/Heading';
import Helper from '../../../../components/values-form/Helper';

type PropsType = {
  closeForm: () => void,
};

type StateType = {
  credentialsName: string,
  serviceAccountKey: string,
};

export default class GCRForm extends Component<PropsType, StateType> {
  state = {
    credentialsName: '',
    serviceAccountKey: '',
  }

  handleSubmit = () => {
    // TODO: implement once api is restructured
  }

  render() {
    return ( 
      <StyledForm>
        <CredentialWrapper>
          <Heading>Porter Settings</Heading>
          <Helper>Give a name to this set of registry credentials (just for Porter).</Helper>
          <InputRow
            type='text'
            value={this.state.credentialsName}
            setValue={(x: string) => this.setState({ credentialsName: x })}
            label='🏷️ Registry Name'
            placeholder='ex: paper-straw'
            width='100%'
          />
          <Heading>GCP Settings</Heading>
          <Helper>Service account credentials for GCP permissions.</Helper>
          <TextArea
            value={this.state.serviceAccountKey}
            setValue={(x: string) => this.setState({ serviceAccountKey: x })}
            label='🔑 Service Account Key (JSON)'
            placeholder='(Paste your JSON service account key here)'
            width='100%'
          />
        </CredentialWrapper>
        <SaveButton
          text='Save Settings'
          makeFlush={true}
          onClick={this.handleSubmit}
        />
      </StyledForm>
    );
  }
}

const CredentialWrapper = styled.div`
  padding: 5px 40px 25px;
  background: #ffffff11;
  border-radius: 5px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;