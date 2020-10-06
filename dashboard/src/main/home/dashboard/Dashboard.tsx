import React, { Component } from 'react';
import styled from 'styled-components';

import Grad from '../../assets/grad.jpg';
import ServiceFunction from './ServiceFunction';
import StatusSummary from './StatusSummary';
import Analytics from './Analytics';
import { Context } from '../../Context';

import Loading from '../../Loading';

class Dashboard extends Component {
  state = {
    demo: false,
  }

  renderStatusSummary = () => {
    return (
        <StatusSummary 
          resources={this.context.activeProject.resources}
          namespace={this.context.activeProject.namespace}
        />          
    );
  }

  render() {
    if (!this.context.activeProject || !this.context.activeProject.namespace) {
      return (
        <StyledDashboard>
          <DashboardWrapper>
            <Loading fixed={true} />
          </DashboardWrapper>
        </StyledDashboard>
      );
    }
    return ( 
      <StyledDashboard>
        <DashboardWrapper>
        <TitleSection demo={this.state.demo}>
          <ProjectIcon>
            <ProjectImage src={Grad} />
            <Overlay>{this.context.activeProject && this.context.activeProject.name[0].toUpperCase()}</Overlay>
          </ProjectIcon>
          <Title>{this.context.activeProject && this.context.activeProject.name}</Title>
          <i 
            className="material-icons" 
            onClick={() => { if (!this.state.demo) { this.context.setCurrentModal('UpdateProjectModal') }}}
          >
            more_vert
          </i>
        </TitleSection>

        <InfoSection>
          <TopRow>
            <InfoLabel onClick={()=>this.setState({ info: !this.state.info })}>
              <i className="material-icons">info</i> Info
            </InfoLabel>
            {this.renderStatusSummary()}
          </TopRow>
          <Description>{this.context.activeProject && this.context.activeProject.description}</Description>
        </InfoSection>

        <LineBreak />

        <ServiceSection>
          <ButtonWrap>
            <Button onClick={() => {this.context.setCurrentModal('CreateService')}}>
              <i className="material-icons">add</i>
              Add a Container
            </Button>
            <ConfigButtonAlt onClick={() => {this.context.setCurrentModal('UpdateConfig')}}>
              <i className="material-icons">add</i>
              Update ConfigMaps
            </ConfigButtonAlt>
          </ButtonWrap>

          <ServiceFunction 
            namespace={this.context.activeProject.namespace}
            app={this.context}
          />
        </ServiceSection>

        </DashboardWrapper>
        <Banner>You are currently on your 7 day free trial.</Banner>
      </StyledDashboard>
    );
  }
}

Dashboard.contextType = Context;
export default Dashboard;

const Banner = styled.div`
  position: fixed;
  bottom: 0;
  display: flex;
  left: 0;
  padding-left: 200px;
  width: calc(100%);
  align-items: center;
  justify-content: center;
  height: 30px;
  background: #616FEEcc;
  color: white;
  z-index: 1;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: ${props => props.theme.font};
  margin-top: 13px;
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
  margin-left: 7px;
  margin-bottom: 35px;
`;

const ButtonWrap = styled.div`
  display: flex;
  align-items: center;
  font-size: 18px;
  margin-top: 2px;
  margin-bottom: 25px;
  color: #00000020;
`;

const Button = styled.div`
  min-width: 145px;
  max-width: 145px;
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: 'Work Sans', sans-serif;
  margin-left: 5px;
  border-radius: 20px;
  color: white;
  padding: 6px 8px;
  margin-right: 10px;
  padding-right: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  background: #616FEEcc;
  :hover {
    background: #505edddd;
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-top: -1px;
    justify-content: center;
  }
`;

const ButtonStack = styled(Button)`
  min-width: 119px;
  max-width: 119px;
  background: #616FEEcc;
  :hover {
    background: #505edddd;
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

const ConfigButtonAlt = styled(ButtonAlt)`
  min-width: 166px;
  max-width: 166px;
`;

const LineBreak = styled.div`
  width: calc(100% - 180px);
  height: 2px;
  background: ${props => props.theme.lineBreak};
  margin: 10px 80px 35px;
`;

const ServiceSection = styled.div`
  padding-bottom: 150px;
`;

const Overlay = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  background: #00000011;
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

const ProjectImage = styled.img`
  height: 45px;
  width: 45px;
  border-radius: 5px;
`;

const ProjectIcon = styled.div`
  position: relative;
  height: 45px;
  width: 45px;
  border-radius: 5px;
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: 'Work Sans', sans-serif;
  margin-left: 20px;
  color: ${props => props.theme.dashboardTitle};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  height: 80px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-left: 17px;

  > i {
    margin-left: 8px;
    cursor: ${props => props.demo ? 'not-allowed' : 'pointer'};
    font-size 18px;
    color: #858FAAaa;
    padding: 5px;
    border-radius: 100px;
    :hover {
      background: ${props => props.theme.shade};
    }
    margin-bottom: -3px;
  }
`;

const StyledDashboard = styled.div`
  height: 100%;
  width: 100vw;
  padding-top: 80px;
  overflow-y: auto;
  display: flex;
  flex: 1;
  justify-content: center;
  background: ${props => props.theme.bg};
  position: relative;
`;

const DashboardWrapper = styled.div`
  width: 80%;
  min-width: 300px;
  padding-bottom: 120px;
`;
