import React, { Component } from 'react';
import styled from 'styled-components';

import close from '../../../assets/close.png';
import { isAlphanumeric } from '../../../shared/common';
import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { ProjectType } from '../../../shared/types';

import InputRow from '../../../components/values-form/InputRow';
import Helper from '../../../components/values-form/Helper';
import Heading from '../../../components/values-form/Heading';
import SaveButton from '../../../components/SaveButton';
import CheckboxList from '../../../components/values-form/CheckboxList';

type PropsType = {
  setSelectedProvisioner: (x: string | null) => void,
  handleError: () => void,
  projectName: string,
  setCurrentView: (x: string | null, data?: any) => void,
};

type StateType = {
  awsRegion: string,
  awsAccessId: string,
  awsSecretKey: string,
  selectedInfras: { value: string, label: string }[],
  buttonStatus: string,
};

const provisionOptions = [
  { value: 'ecr', label: 'Elastic Container Registry (ECR)' },
  { value: 'eks', label: 'Elastic Kubernetes Service (EKS)' },
];

// TODO: Consolidate across forms w/ HOC
export default class AWSFormSection extends Component<PropsType, StateType> {
  state = {
    awsRegion: '',
    awsAccessId: '',
    awsSecretKey: '',
    selectedInfras: [...provisionOptions],
    buttonStatus: '',
  }

  checkFormDisabled = () => {
    let { 
      awsRegion,
      awsAccessId, 
      awsSecretKey, 
      selectedInfras,
    } = this.state;
    let { projectName } = this.props;
    if (projectName || projectName === '') {
      return (
        !isAlphanumeric(projectName) 
          || !(awsAccessId !== '' && awsSecretKey !== '' && awsRegion !== '')
          || selectedInfras.length === 0
      );
    } else {
      return (
        !(awsAccessId !== '' && awsSecretKey !== '' && awsRegion !== '')
          || selectedInfras.length === 0
      );
    }
  }

  // Step 1: Create a project
  createProject = (callback?: any) => {
    console.log('Creating project');
    let { projectName, handleError } = this.props;
    let { 
      user, 
      setProjects, 
      setCurrentProject, 
      currentProject 
    } = this.context;

    api.createProject('<token>', { name: projectName }, {
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        handleError();
        return;
      } else {
        api.getProjects('<token>', {}, { 
          id: user.userId 
        }, (err: any, res: any) => {
          if (err) {
            console.log(err);
            handleError();
            return;
          }
          setProjects(res.data);
          if (res.data.length > 0) {
            let tgtProject = res.data.find((el: ProjectType) => {
              return el.name === projectName;
            });
            setCurrentProject(tgtProject);
            callback && callback();
          } 
        });
      }
    });
  }

  provisionECR = (callback?: any) => {
    console.log('Provisioning ECR')
    let { awsAccessId, awsSecretKey, awsRegion } = this.state;
    let { currentProject } = this.context;
    let { handleError } = this.props;

    api.createAWSIntegration('<token>', {
      aws_region: awsRegion,
      aws_access_key_id: awsAccessId,
      aws_secret_access_key: awsSecretKey,
    }, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        handleError();
        return;
      }

      api.provisionECR('<token>', {
        aws_integration_id: res.data.id,
        ecr_name: `${currentProject.name}-registry`
      }, {id: currentProject.id}, (err: any, res: any) => {
        if (err) {
          console.log(err);
          handleError();
          return;
        }
        callback && callback();
      })
      
    });
  }

  provisionEKS = () => {
    console.log('Provisioning EKS');
    let { setCurrentView, handleError } = this.props;
    let { awsAccessId, awsSecretKey, awsRegion } = this.state;
    let { currentProject } = this.context;

    let clusterName = `${currentProject.name}-cluster`
    api.createAWSIntegration('<token>', {
      aws_region: awsRegion,
      aws_access_key_id: awsAccessId,
      aws_secret_access_key: awsSecretKey,
      aws_cluster_id: clusterName,
    }, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        handleError();
        return;
      }
      api.provisionEKS('<token>', {
        aws_integration_id: res.data.id,
        eks_name: clusterName,
      }, { id: currentProject.id}, (err: any, eks: any) => {
        if (err) {
          console.log(err);
          handleError();
          return;
        }
        setCurrentView('provisioner');
      })
    })
  }

  // TODO: handle generically (with > 2 steps)
  onCreateAWS = () => {
    let { projectName, setCurrentView } = this.props;
    let { selectedInfras } = this.state;

    console.log(selectedInfras);
    if (!projectName) {
      console.log(selectedInfras)
      if (selectedInfras.length === 2) {
        // Case: project exists, provision ECR + EKS
        this.provisionECR(this.provisionEKS);
      } else if (selectedInfras[0].value === 'ecr') {
        // Case: project exists, only provision ECR
        this.provisionECR(() => setCurrentView('provisioner'));
      } else {
        // Case: project exists, only provision EKS
        this.provisionEKS();
      }
    } else {
      if (selectedInfras.length === 2) {
        // Case: project DNE, provision ECR + EKS 
        this.createProject(() => this.provisionECR(this.provisionEKS));
      } else if (selectedInfras[0].value === 'ecr') {
        // Case: project DNE, only provision ECR
        this.createProject(() => this.provisionECR(() => {
          setCurrentView('provisioner');
        }));
      } else {
        // Case: project DNE, only provision EKS
        this.createProject(this.provisionEKS);
      }
    }
  }

  render() {
    let { setSelectedProvisioner } = this.props;
    let {
      awsRegion,
      awsAccessId,
      awsSecretKey,
      selectedInfras,
    } = this.state;

    return (
      <StyledAWSFormSection>
        <FormSection>
          <CloseButton onClick={() => setSelectedProvisioner(null)}>
            <CloseButtonImg src={close} />
          </CloseButton>
          <Heading isAtTop={true}>
            AWS Credentials
            <GuideButton 
              href='https://docs.getporter.dev/docs/getting-started-with-porter-on-aws' 
              target='_blank'
            >
              <i className="material-icons-outlined">help</i> 
              Guide
            </GuideButton>
          </Heading>
          <InputRow
            type='text'
            value={awsRegion}
            setValue={(x: string) => this.setState({ awsRegion: x })}
            label='📍 AWS Region'
            placeholder='ex: us-east-2'
            width='100%'
            isRequired={true}
          />
          <InputRow
            type='text'
            value={awsAccessId}
            setValue={(x: string) => this.setState({ awsAccessId: x })}
            label='👤 AWS Access ID'
            placeholder='ex: AKIAIOSFODNN7EXAMPLE'
            width='100%'
            isRequired={true}
          />
          <InputRow
            type='password'
            value={awsSecretKey}
            setValue={(x: string) => this.setState({ awsSecretKey: x })}
            label='🔒 AWS Secret Key'
            placeholder='○ ○ ○ ○ ○ ○ ○ ○ ○'
            width='100%'
            isRequired={true}
          />
          <Br />
          <Heading>Resources</Heading>
          <Helper>Porter will provision the following resources</Helper>
          <CheckboxList
            options={provisionOptions}
            selected={selectedInfras}
            setSelected={(x: { value: string, label: string }[]) => {
              this.setState({ selectedInfras: x });
            }}
          />
        </FormSection>
        {this.props.children ? this.props.children : <Padding />}
        <SaveButton
          text='Submit'
          disabled={this.checkFormDisabled()}
          onClick={this.onCreateAWS}
          makeFlush={true}
          helper='Note: Provisioning can take up to 15 minutes'
        />
      </StyledAWSFormSection>
    );
  }
}

AWSFormSection.contextType = Context;

const Padding = styled.div`
  height: 15px;
`;

const Br = styled.div`
  width: 100%;
  height: 2px;
`;

const StyledAWSFormSection = styled.div`
  position: relative;
  padding-bottom: 35px;
`;

const FormSection = styled.div`
  background: #ffffff11;
  margin-top: 25px;
  background: #26282f;
  border-radius: 5px;
  margin-bottom: 25px;
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