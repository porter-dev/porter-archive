import React, { Component } from 'react';
import styled from 'styled-components';

import gradient from '../../../assets/gradient.jpg';

import { Context } from '../../../shared/Context';

type PropsType = {
  setCurrentView: (x: string) => void,
}

type StateType = {
  inviteLink: string,
}

export default class ProjectSettings extends Component<PropsType, StateType> {
  state = {
    inviteLink: 'https://asdjfijawioejfialawe.awef.awejiofawjefkajweilfjioawjfli/ajfwieofjaiowejfklajwle/fjawieofaw',
  }

  renderTitle = () => {
    let { currentProject } = this.context;
    if (currentProject) {
      return (
        <>
          <TitleSection>
            <DashboardIcon>
              <DashboardImage src={gradient} />
              <Overlay>{currentProject.name[0].toUpperCase()}</Overlay>
            </DashboardIcon>
            <Title>{currentProject.name} Settings</Title>
          </TitleSection>
          <LineBreak />
        </>
      );
    }
  }

  copyToClip = () => {
    navigator.clipboard.writeText(this.state.inviteLink).then(function() {
    }, function() {
      console.log("couldn't copy link to clipboard");
    })
  }

  renderCollab = () => {
    return (
      <>
        <Subtitle>Manage Access</Subtitle>
        <Rower>
          <ShareLink
            disabled={true}
            type='string'
            value={this.state.inviteLink}
            placeholder='no link available'
          />
          <CopyButton
            onClick={() => this.copyToClip()}
          >
            Copy Link:
          </CopyButton>
        </Rower>
      </>
    )
  }

  renderDelete = () => {
    let { currentProject } = this.context;
    if (currentProject) {
      return (
        <>
          <Subtitle>Other Settings</Subtitle>
          <Rower>
            <BodyText>
              Delete this project: 
            </BodyText>
            <DeleteButton
              onClick={() => this.context.setCurrentModal('UpdateProjectModal', { 
                currentProject: currentProject,
                setCurrentView: this.props.setCurrentView,
              })}
            >
              Delete
            </DeleteButton>
          </Rower>
        </>
      )
    }
  }

  renderContents = () => {
    return (
      <ContentHolder>
          {this.renderCollab()}
          {this.renderDelete()}
      </ContentHolder>
    )
  }

  render () {
    return (
      <StyledProjectSettings>
        {this.renderTitle()}
        {this.renderContents()}
      </StyledProjectSettings>
    );
  }
}

ProjectSettings.contextType = Context;

const Overlay = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  background: #00000028;
  top: 0;
  left: 0;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 500;
  font-family: 'Work Sans', sans-serif;
  color: white;
`;

const DashboardImage = styled.img`
  height: 45px;
  width: 45px;
  border-radius: 5px;
`;

const DashboardIcon = styled.div`
  position: relative;
  height: 45px;
  width: 45px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 22px;
  }
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: 'Work Sans', sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 20px;
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 40px;
`;

const StyledProjectSettings = styled.div`
  width: calc(90% - 150px);
  min-width: 300px;
  padding-top: 45px;
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px -20px;
`;

const Subtitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  font-family: 'Work Sans', sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 24px;
  margin-top: 32px;
`;

const BodyText = styled.div`
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
`;

const CopyButton = styled.div`
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
  margin-left: 12px;
  float: right;
  width: 128px;
  padding-top: 8px;
  padding-bottom: 8px;
  border-radius: 5px;
  border: 1px solid #ffffff20;
  background-color: #ffffff10;
  text-align: center;
  overflow: hidden;
  transition: all 0.1s ease-out;
  :hover {
    border: 1px solid #ffffff66;
    background-color: #ffffff20;
  }
`;

const DeleteButton = styled(CopyButton)`
  background-color: #b91133;
  border: none;
  width: 88px;
  margin-left: 20px;
  :hover {
    background-color: #b91133;
    filter: brightness(120%);
    border: none;
  }
`;

const ContentHolder = styled.div`
  min-width: 420px;
  width: 100%;
`;

const Rower = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const ShareLink = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: 100%;
  color: #74a5f7;
  padding: 5px 10px;
  margin-right: 8px;
  height: 30px;
  text-overflow: ellipsis;
`;