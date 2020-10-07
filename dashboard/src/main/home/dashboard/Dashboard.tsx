import React, { Component } from 'react';
import styled from 'styled-components';
import gradient from '../../../assets/gradient.jpg';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';
import { StorageType } from '../../../shared/types';

class Dashboard extends Component {

  componentDidMount() {
    let { userId, setCurrentError, currentCluster } = this.context;

    console.log(currentCluster);
    
    api.getCharts('<token>', {
      user_id: userId,
      helm: {
        namespace: '',
        context: currentCluster,
        storage: 'memory',
      },
      filter: {
        namespace: '',
        limit: 10,
        skip: 0,
        byDate: false,
        statusFilter: ['deployed']
      }
    }, {}, (err: any, res: any) => {
      if (err) {
        setCurrentError(JSON.stringify(err));
      } else {
        
        console.log(res);
      }
    });
  }

  render() {
    let { currentCluster } = this.context;

    return ( 
      <div>
        <TitleSection>
          <ProjectIcon>
            <ProjectImage src={gradient} />
            <Overlay>{currentCluster && currentCluster[0].toUpperCase()}</Overlay>
          </ProjectIcon>
          <Title>{currentCluster}</Title>
          <i className="material-icons">more_vert</i>
        </TitleSection>

        <InfoSection>
          <TopRow>
            <InfoLabel>
              <i className="material-icons">info</i> Info
            </InfoLabel>
          </TopRow>
            <Description>Porter dashboard for {currentCluster}.</Description>
        </InfoSection>

        <LineBreak />
      </div>
    );
  }
}

Dashboard.contextType = Context;
export default Dashboard;

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
  background: #ffffff20;
  margin: 10px 80px 35px;
`;

const ServiceSection = styled.div`
  padding-bottom: 150px;
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
  color: #ffffff;
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