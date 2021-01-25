import React, { Component } from 'react';
import styled from 'styled-components';

import InviteList from './InviteList';
import TabRegion from '../../../components/TabRegion';

import { Context } from '../../../shared/Context';

type PropsType = {
  setCurrentView: (x: string) => void,
}

type StateType = {
  projectName: string,
  currentTab: string,
}

const tabOptions = [
  { value: 'manage-access', label: 'Manage Access' },
  { value: 'additional-settings', label: 'Additional Settings' }
];

export default class ProjectSettings extends Component<PropsType, StateType> {
  state = {
    projectName: '',
    currentTab: 'manage-access',
  }

  componentDidMount() {
    let { currentProject, user } = this.context;
    this.setState({ projectName: currentProject.name });
  }

  renderTabContents = () => {
    if (this.state.currentTab === 'manage-access') {
      return <InviteList />;
    } else {
      return (
        <>
          <Subtitle>Other Settings</Subtitle>
          <Rower>
            <BodyText>
              Delete this project: 
            </BodyText>
            <DeleteButton
              onClick={() => {
                this.context.setCurrentModal('UpdateProjectModal', {
                  currentProject: this.context.currentProject,
                  setCurrentView: this.props.setCurrentView,
                });
              }}
            >
              Delete
            </DeleteButton>
          </Rower>
        </>
      )
    }
  }

  render () {
    return (
      <StyledProjectSettings>
        <TitleSection>
          <Title>Project Settings</Title>
        </TitleSection>
        <TabRegion
          currentTab={this.state.currentTab}
          setCurrentTab={(x: string) => this.setState({ currentTab: x })}
          options={tabOptions}
        >
          {this.renderTabContents()}
        </TabRegion>
      </StyledProjectSettings>
    );
  }
}

ProjectSettings.contextType = Context;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: 'Work Sans', sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  margin-bottom: 13px;
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
  margin-bottom: 55px;
`;

const Rower = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;