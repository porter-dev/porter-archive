import React, { Component } from 'react';
import styled from 'styled-components';
import gradient from '../../../assets/gradient.jpg';

import { Context } from '../../../shared/Context';
import { ChartType, StorageType, Cluster } from '../../../shared/types';
import api from '../../../shared/api';

import ChartList from './chart/ChartList';
import NamespaceSelector from './NamespaceSelector';
import ExpandedChart from './expanded-chart/ExpandedChart';

type PropsType = {
  currentCluster: Cluster,
  setSidebar: (x: boolean) => void
  setCurrentView: (x: string) => void,
};

type StateType = {
  namespace: string,
  currentChart: ChartType | null
};

export default class ClusterDashboard extends Component<PropsType, StateType> {
  state = {
    namespace: '',
    currentChart: null as (ChartType | null)
  }

  componentDidUpdate(prevProps: PropsType) {

    // Reset namespace filter and close expanded chart on cluster change
    if (prevProps.currentCluster !== this.props.currentCluster) {
      this.setState({ namespace: '', currentChart: null });
    }
  }

  renderDashboardIcon = () => {
    if (false) {
      let { currentCluster } = this.props;
      return (
        <DashboardIcon>
          <DashboardImage src={gradient} />
          <Overlay>{currentCluster && currentCluster.name[0].toUpperCase()}</Overlay>
        </DashboardIcon>
      );
    }

    return (
      <DashboardIcon>
        <i className="material-icons">device_hub</i>
      </DashboardIcon>
    );
  }

  renderContents = () => {
    let { currentCluster, setSidebar, setCurrentView } = this.props;

    if (this.state.currentChart) {
      return (
        <ExpandedChart
          namespace={this.state.namespace}
          currentCluster={this.props.currentCluster}
          currentChart={this.state.currentChart}
          setCurrentChart={(x: ChartType | null) => this.setState({ currentChart: x })}
          setSidebar={setSidebar}
          setCurrentView={setCurrentView} // Link to integrations from chart settings
        />
      );
    }

    return (
      <div>
        <TitleSection>
          {this.renderDashboardIcon()}
          <Title>{currentCluster.name}</Title>
          <i className="material-icons">more_vert</i>
        </TitleSection>

        <InfoSection>
          <TopRow>
            <InfoLabel>
              <i className="material-icons">info</i> Info
            </InfoLabel>
          </TopRow>
          <Description>Cluster dashboard for {currentCluster.name}.</Description>
        </InfoSection>

        <LineBreak />
        
        <ControlRow>
          <Button
            onClick={() => this.props.setCurrentView('templates')}
          >
            <i className="material-icons">add</i> Deploy Template
          </Button>
          <NamespaceSelector
            setNamespace={(namespace) => this.setState({ namespace })}
            namespace={this.state.namespace}
          />
        </ControlRow>

        <ChartList
          currentCluster={currentCluster}
          namespace={this.state.namespace}
          setCurrentChart={(x: ChartType | null) => this.setState({ currentChart: x })}
        />
      </div>
    );
  }

  render() {
    return (
      <div>
        {this.renderContents()}
      </div>
    );
  }
}

ClusterDashboard.contextType = Context;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
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
  cursor: ${(props: { disabled?: boolean }) => props.disabled ? 'not-allowed' : 'pointer'};

  background: ${(props: { disabled?: boolean }) => props.disabled ? '#aaaabbee' : '#616FEEcc'};
  :hover {
    background: ${(props: { disabled?: boolean }) => props.disabled ? '' : '#505edddd'};
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
  min-width: 45px;
  width: 45px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676C7C;
  border: 2px solid #8e94aa;

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
    cursor: not-allowed;
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