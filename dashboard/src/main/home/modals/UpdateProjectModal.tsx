import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../assets/close.png';
import gradient from '../../../assets/gradient.jpg';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';

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
  
  handleDelete = () => {
    let { currentProject } = this.context;
    this.setState({ status: 'loading' });
    api.deleteProject('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        this.setState({ status: 'error' });
        // console.log(err)
      } else {
        this.setState({ status: 'successful', showDeleteOverlay: false });
      }
    });
  }

  render() {
    return (
      <StyledCreateProjectModal>
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
      </StyledCreateProjectModal>
      );
  }
}

UpdateProjectModal.contextType = Context;

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

const StyledCreateProjectModal= styled.div`
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