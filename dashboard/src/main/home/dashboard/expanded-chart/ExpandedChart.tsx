import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../../assets/close.png';

import { ChartType } from '../../../../shared/types';
import { Context } from '../../../../shared/Context';

import RevisionSection from './RevisionSection';

type PropsType = {
  currentChart: ChartType,
  setCurrentChart: (x: ChartType | null) => void,
  refreshChart: () => void
};

type StateType = {
  showRevisions: boolean
};

export default class ExpandedChart extends Component<PropsType, StateType> {
  state = {
    showRevisions: false
  }

  renderIcon = () => {
    let { currentChart } = this.props;

    if (currentChart.chart.metadata.icon && currentChart.chart.metadata.icon !== '') {
      return <Icon src={currentChart.chart.metadata.icon} />
    } else {
      return <i className="material-icons">tonality</i>
    }
  }

  readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${time} on ${date}`;
  }

  render() {
    let { currentChart, setCurrentChart, refreshChart } = this.props;
    let chart = currentChart;

    return ( 
      <StyledExpandedChart>
        <TitleSection>
          <Title>
            <IconWrapper>
              {this.renderIcon()}
            </IconWrapper>
            {chart.name}
          </Title>
          <InfoWrapper>
            <StatusIndicator>
              <StatusColor status={chart.info.status} />
              {chart.info.status}
            </StatusIndicator>

            <LastDeployed>
              <Dot>•</Dot>Last deployed {this.readableDate(chart.info.last_deployed)}
            </LastDeployed>
          </InfoWrapper>

          <TagWrapper>
            Namespace
            <NamespaceTag>
              {chart.namespace}
            </NamespaceTag>
          </TagWrapper>
        </TitleSection>

        <CloseButton onClick={() => setCurrentChart(null)}>
          <CloseButtonImg src={close} />
        </CloseButton>

        <RevisionSection
          showRevisions={this.state.showRevisions}
          toggleShowRevisions={() => this.setState({ showRevisions: !this.state.showRevisions })}
          chart={chart}
          refreshChart={refreshChart}
        />

        <ChartSection>
          <Placeholder>(Under construction)</Placeholder>
        </ChartSection>
      </StyledExpandedChart>
    );
  }
}

ExpandedChart.contextType = Context;

const Placeholder = styled.div`
  color: #ffffff66;
  padding-bottom: 30px;
`;

const ChartSection = styled.div`
  display: flex;
  margin-top: 20px;
  border-radius: 5px;
  flex: 1;
  width: 100%;
  background: #ffffff11;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;

const StatusColor = styled.div`
  margin-bottom: 1px;
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) => (props.status === 'deployed' ? '#4797ff' : props.status === 'failed' ? "#ed5f85" : "#f5cb42")};
  border-radius: 20px;
  margin-right: 16px;
`;

const Dot = styled.div`
  margin-right: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 6px;
  margin-top: 22px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 10px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  position: absolute;
  bottom: 0px;
  right: 0px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #ffffff22;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const StatusIndicator = styled.div`
  display: flex;
  height: 20px;
  font-size: 13px;
  flex-direction: row;
  text-transform: capitalize;
  align-items: center;
  font-family: 'Hind Siliguri', sans-serif;
  color: #aaaabb;
  animation: fadeIn 0.5s;

  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const Icon = styled.img`
  width: 100%;
`;

const IconWrapper = styled.div`
  color: #efefef;
  font-size: 16px;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  margin-right: 12px;

  > i {
    font-size: 20px;
  }
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
`;

const TitleSection = styled.div`
  width: 100%;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
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

const StyledExpandedChart = styled.div`
  width: calc(100% - 50px);
  height: calc(100% - 50px);
  background: red;
  z-index: 0;
  position: absolute;
  top: 25px;
  left: 25px;;
  border-radius: 10px;
  background: #26282f;
  box-shadow: 0 5px 12px 4px #00000033;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  padding: 25px; 
  display: flex;
  flex-direction: column;

  @keyframes floatIn {
    from { opacity: 0; transform: translateY(30px) }
    to { opacity: 1; transform: translateY(0px) }
  }
`;