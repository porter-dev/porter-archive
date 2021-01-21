import React, { Component } from 'react';
import styled from 'styled-components';

import close from '../../../assets/close.png';

import InputRow from '../../../components/values-form/InputRow';
import Helper from '../../../components/values-form/Helper';
import Heading from '../../../components/values-form/Heading';
import SaveButton from '../../../components/SaveButton';
import CheckboxList from '../../../components/values-form/CheckboxList';

type PropsType = {
  setSelectedProvisioner: (x: string | null) => void,
};

type StateType = {
  gcpRegion: string,
  gcpProjectId: string,
  gcpKeyData: string,
  selectedInfras: { value: string, label: string }[],
};

const dummyOptions = [
  { value: 'gcr', label: 'Google Container Registry (GCR)' },
  { value: 'gke', label: 'Googke Kubernetes Engine (GKE)' },
];

export default class GCPFormSection extends Component<PropsType, StateType> {
  state = {
    gcpRegion: '',
    gcpProjectId: '',
    gcpKeyData: '',
    selectedInfras: [] as { value: string, label: string }[],
  }

  render() {
    let { setSelectedProvisioner } = this.props;
    let {
      gcpRegion,
      gcpProjectId,
      gcpKeyData,
      selectedInfras,
    } = this.state;

    return (
      <StyledGCPFormSection>
        <FormSection>
          <CloseButton onClick={() => setSelectedProvisioner(null)}>
            <CloseButtonImg src={close} />
          </CloseButton>
          <Heading isAtTop={true}>
            GCP Credentials
            <GuideButton 
              href='https://docs.getporter.dev/docs/getting-started-with-porter-on-gcp' 
              target='_blank'
            >
              <i className="material-icons-outlined">help</i> 
              Guide
            </GuideButton>
          </Heading>
          <InputRow
            type='text'
            value={gcpRegion}
            setValue={(x: string) => this.setState({ gcpRegion: x })}
            label='📍 GCP Region'
            placeholder='ex: us-central1-a'
            width='100%'
            isRequired={true}
          />
          <InputRow
            type='text'
            value={gcpProjectId}
            setValue={(x: string) => this.setState({ gcpProjectId: x })}
            label='🏷️ GCP Project ID'
            placeholder='ex: pale-moon-24601'
            width='100%'
            isRequired={true}
          />
          <InputRow
            type='password'
            value={gcpKeyData}
            setValue={(x: string) => this.setState({ gcpKeyData: x })}
            label='🔒 GCP Key Data'
            placeholder='○ ○ ○ ○ ○ ○ ○ ○ ○'
            width='100%'
            isRequired={true}
          />
          <Br />
          <Heading>Resources</Heading>
          <Helper>Porter will provision the following resources</Helper>
          <CheckboxList
            options={dummyOptions}
            selected={selectedInfras}
            setSelected={(x: { value: string, label: string }[]) => {
              this.setState({ selectedInfras: x });
            }}
          />
        </FormSection>
        <SaveButton
          text='Submit'
          disabled={true}
          onClick={() => console.log('oolala')}
          makeFlush={true}
          helper='Note: Provisioning can take up to 15 minutes'
        />
      </StyledGCPFormSection>
    );
  }
}

const Br = styled.div`
  width: 100%;
  height: 2px;
`;

const StyledGCPFormSection = styled.div`
  position: relative;
  padding-bottom: 70px;
`;

const FormSection = styled.div`
  background: #ffffff11;
  margin-top: 25px;
  background: #26282f;
  border-radius: 5px;
  padding: 25px;
  padding-bottom: 16px;
  font-size: 13px;
  animation: fadeIn 0.3s 0s;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const GuideButton = styled.a`
  display: flex;
  align-items: center;
  margin-left: 20px;
  color: #aaaabb;
  font-size: 13px;
  margin-bottom: -1px;
  border: 1px solid #aaaabb;
  padding: 5px 10px;
  padding-left: 6px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    color: #ffffff;
    border: 1px solid #ffffff;

    > i {
      color: #ffffff;
    }
  }

  > i {
    color: #aaaabb;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;