import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../assets/close.png';
import gradient from '../../../assets/gradient.jpg';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { ClusterType } from '../../../shared/types';

import SaveButton from '../../../components/SaveButton';
import InputRow from '../../../components/values-form/InputRow';
import ConfirmOverlay from '../../../components/ConfirmOverlay';

type PropsType = {
};

type StateType = {
  projectName: string,
  status: string | null,
  showDeleteOverlay: boolean
};

export default class UpdateProjectModal extends Component<PropsType, StateType> {
  state = {
    projectName: this.context.currentModalData.currentProject.name,
    status: null as string | null,
    showDeleteOverlay: false,
  };

  // Possibly consolidate into context (w/ ProjectSection + NewProject)
  getProjects = () => {
    let { user, currentProject, projects, setProjects } = this.context;
    api.getProjects('<token>', {}, { id: user.userId }, (err: any, res: any) => {
      if (err) {
        console.log(err)
      } else if (res.data) {
        setProjects(res.data);
        if (res.data.length > 0) {
          this.context.setCurrentProject(res.data[0]);
        } else {
          this.context.currentModalData.setCurrentView('new-project');
        }
        this.context.setCurrentModal(null, null);
      }
    });
  }
  
  // TODO: Handle update to unmounted component
  handleDelete = () => {
    let { currentProject } = this.context;
    this.setState({ status: 'loading' });
    api.deleteProject('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        this.setState({ status: 'error' });
        // console.log(err)
      } else {
        this.getProjects();
        this.setState({ status: 'successful', showDeleteOverlay: false });
      }
    });

    // Loop through and delete infra of all clusters we've provisioned
    api.getClusters('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        res.data.forEach((cluster: ClusterType) => {

          // Handle destroying infra we've provisioned
          if (cluster.infra_id) {
            console.log('destroying provisioned infra...', cluster.infra_id);
            api.destroyCluster('<token>', { eks_name: cluster.name }, { 
              project_id: currentProject.id,
              infra_id: cluster.infra_id,
            }, (err: any, res: any) => {
              if (err) {
                this.setState({ status: 'error' });
                console.log(err)
              } else {
                console.log('destroyed provisioned infra:', cluster.infra_id);
              }
            });
          }
        });
      }
    });
  }

  render() {
    return (
      <StyledUpdateProjectModal>
        <CloseButton onClick={() => {
          this.context.setCurrentModal(null, null);
        }}>
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Project Settings</ModalTitle>
        <Subtitle>
          Project name
        </Subtitle>

        <InputWrapper>
          <ProjectIcon>
            <ProjectImage src={gradient} />
            <Letter>{this.state.projectName ? this.state.projectName[0].toUpperCase() : '-'}</Letter>
          </ProjectIcon>
          <InputRow
            disabled={true}
            type='string'
            value={this.state.projectName}
            setValue={(x: string) => this.setState({ projectName: x })}
            placeholder='ex: perspective-vortex'
            width='470px'
          />
        </InputWrapper>

        <Warning highlight={true}>
          ⚠️ Deletion may result in dangling resources. Please visit the AWS console to ensure that all resources have been removed.
        </Warning>
        <Help 
          href='https://docs.getporter.dev/docs/getting-started-with-porter-on-aws#deleting-provisioned-resources'
          target='_blank'
        >
          <i className="material-icons">help_outline</i> Help
        </Help>

        <SaveButton
          text='Delete Project'
          color='#b91133'
          onClick={() => this.setState({ showDeleteOverlay: true })}
          status={this.state.status}
        />

        <ConfirmOverlay
          show={this.state.showDeleteOverlay}
          message={`Are you sure you want to delete ${this.state.projectName}?`}
          onYes={this.handleDelete}
          onNo={() => this.setState({ showDeleteOverlay: false })}
        />
      </StyledUpdateProjectModal>
    );
  }
}

UpdateProjectModal.contextType = Context;

const Help = styled.a`
  position: absolute;
  left: 31px;
  bottom: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff55;
  font-size: 13px;
  :hover {
    color: #ffffff;
  }

  > i {
    margin-right: 9px;
    font-size: 16px;
  }
`;

const Warning = styled.div`
  font-size: 13px;
  display: flex;
  border-radius: 3px;
  width: calc(100%);
  margin-top: 10px;
  margin-left: 2px;
  line-height: 1.4em;
  align-items: center;
  color: white;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
  color: ${(props: { highlight: boolean, makeFlush?: boolean }) => props.highlight ? '#f5cb42' : ''};
`;

const Letter = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  background: #00000028;
  top: 0;
  left: 0;
  display: flex;
  color: white;
  align-items: center;
  justify-content: center;
`;

const ProjectImage = styled.img`
  width: 100%;
  height: 100%;
`;

const ProjectIcon = styled.div`
  width: 25px;
  min-width: 25px;
  height: 25px;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-right: 10px;
  font-weight: 400;
  margin-top: 14px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Subtitle = styled.div`
  margin-top: 23px;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  color: #aaaabb;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: -10px;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: 'Assistant';
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
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

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledUpdateProjectModal= styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 32px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;