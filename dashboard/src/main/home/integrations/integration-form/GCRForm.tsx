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
  gcpRegion: string,
  serviceAccountKey: string,
  gcpProjectID: string,
};

export default class GCRForm extends Component<PropsType, StateType> {
  state = {
    credentialsName: '',
    gcpRegion: '',
    serviceAccountKey: '',
    gcpProjectID: '',
  }

  isDisabled = (): boolean => {
    let { gcpRegion, gcpProjectID, serviceAccountKey } = this.state;
    if (gcpRegion  === '' || serviceAccountKey === '' || gcpProjectID === '') {
      return true;
    }
    return false;
  }
  
  handleSubmit = () => {
    let { currentProject } = this.context;

    api.createGCPIntegration('<token>', {
      gcp_region: this.state.gcpRegion,
      gcp_key_data: this.state.serviceAccountKey,
      gcp_project_id: this.state.gcpProjectID,
    }, {
      project_id: currentProject.id,
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        api.createGCR('<token>', {
          gcp_integration_id: res.data.id,
        }, {
          project_id: currentProject.id,
        }, (err: any, res: any) => {
          if (err) {
            console.log(err);
          } else {
            this.props.closeForm();
          }
        })
      }
    })
  }

  render() {
    return ( 
      <StyledForm>
        <CredentialWrapper>
          <Heading>GCP Settings</Heading>
          <Helper>Service account credentials for GCP permissions.</Helper>
          <InputRow
            type='text'
            value={this.state.gcpRegion}
            setValue={(x: string) => this.setState({ gcpRegion: x })}
            label='📍 GCP Region'
            placeholder='ex: uranus-north-12'
            width='100%'
          />
          <TextArea
            value={this.state.serviceAccountKey}
            setValue={(x: string) => this.setState({ serviceAccountKey: x })}
            label='🔑 Service Account Key (JSON)'
            placeholder='(Paste your JSON service account key here)'
            width='100%'
          />
          <InputRow
            type='text'
            value={this.state.gcpProjectID}
            setValue={(x: string) => this.setState({ gcpProjectID: x })}
            label='📝 GCP Project ID'
            placeholder='ex: skynet-dev-172969'
            width='100%'
          />
        </CredentialWrapper>
        <SaveButton
          text='Save Settings'
          makeFlush={true}
          disabled={this.isDisabled()}
          onClick={this.isDisabled() ? null : this.handleSubmit}
        />
      </StyledForm>
    );
  }
}

GCRForm.contextType = Context;

const CredentialWrapper = styled.div`
  padding: 5px 40px 25px;
  background: #ffffff11;
  border-radius: 5px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;