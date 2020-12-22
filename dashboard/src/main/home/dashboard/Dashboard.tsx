import React, { Component } from 'react';
import styled from 'styled-components';
import gradient from '../../../assets/gradient.jpg';

import { Context } from '../../../shared/Context';
import PipelinesSection from './PipelinesSection';

type PropsType = {
};

type StateType = {
};

export default class Dashboard extends Component<PropsType, StateType> {
  renderDashboardIcon = () => {
    let { currentProject } = this.context;
    return (
      <DashboardIcon>
        <DashboardImage src={gradient} />
        <Overlay>{currentProject && currentProject.name[0].toUpperCase()}</Overlay>
      </DashboardIcon>
    );
  }

  renderContents = () => {
    let { currentProject } = this.context;
    if (currentProject) {
      return (
        <div>
          <TitleSection>
            {this.renderDashboardIcon()}
            <Title>{currentProject && currentProject.name}</Title>
            <i
              className="material-icons"
              onClick={() => this.context.setCurrentModal('UpdateProjectModal', { currentProject: currentProject })}
            >
              more_vert
          </i>
          </TitleSection>

          <InfoSection>
            <TopRow>
              <InfoLabel>
                <i className="material-icons">info</i> Info
            </InfoLabel>
            </TopRow>
            <Description>Project overview for {currentProject && currentProject.name}.</Description>
          </InfoSection>

          <LineBreak />

          <PipelinesSection />
        </div>
      );
    }

    /*
      <Placeholder>
        🚀 Pipelines coming soon.
      </Placeholder>
    */
  }

  render() {
    return (
      <div>
        {this.renderContents()}
      </div>
    );
  }
}

Dashboard.contextType = Context;

const Placeholder = styled.div`
  width: 100%;
  height: calc(100vh - 380px);
  margin-top: 30px;
  display: flex;
  padding-bottom: 20px;
  align-items: center;
  justify-content: center;
  color: #aaaabb;
  border-radius: 5px;
  text-align: center;
  font-size: 13px;
  background: #ffffff08;
  font-family: 'Work Sans', sans-serif;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #ffffff;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #7A838F;
  font-size: 13px;
  > i {
    color: #8B949F;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  margin-top: 20px;
  font-family: 'Work Sans', sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: 'Work Sans', sans-serif;
  border-radius: 20px;
  color: white;
  height: 30px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: not-allowed;

  background: ${(props: { disabled: boolean }) => props.disabled ? '#aaaabbee' :'#616FEEcc'};
  :hover {
    background: ${(props: { disabled: boolean }) => props.disabled ? '' : '#505edddd'};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const ButtonAlt = styled(Button)`
  min-width: 150px;
  max-width: 150px;
  background: #7A838Fdd;

  :hover {
    background: #69727eee;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 180px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 80px 35px;
`;

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
  font-size: 20px;
  font-weight: 500;
  font-family: 'Work Sans', sans-serif;
  margin-left: 18px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  height: 80px;
  margin-top: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-left: 0px;

  > i {
    margin-left: 10px;
    cursor: pointer;
    font-size 18px;
    color: #858FAAaa;
    padding: 5px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
    margin-bottom: -3px;
  }
`;