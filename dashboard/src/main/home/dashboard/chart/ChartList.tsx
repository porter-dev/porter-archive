import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';
import { ChartType } from '../../../../shared/types';

import Chart from './Chart';
import Loading from '../../../../components/Loading';

type PropsType = {
  currentCluster: string
};

type StateType = {
  charts: ChartType[],
  loading: boolean
};

export default class ChartList extends Component<PropsType, StateType> {
  state = {
    charts: [] as ChartType[],
    loading: false,
  }

  updateCharts = () => {
    let { setCurrentError, currentCluster } = this.context;
    
    this.setState({ loading: true });
    api.getCharts('<token>', {
      namespace: '',
      context: currentCluster,
      storage: 'secret',
      limit: 20,
      skip: 0,
      byDate: false,
      statusFilter: ['deployed']
    }, {}, (err: any, res: any) => {
      if (err) {
        setCurrentError(JSON.stringify(err));
        this.setState({ loading: false });
      } else {
        if (res.data) {
          this.setState({ charts: res.data });
        }
        this.setState({ loading: false });
      }
    });
  }

  componentDidMount() {
    this.updateCharts();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props) {
      this.updateCharts();
    }
  }

  renderChartList = () => {
    if (this.state.loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    }

    return this.state.charts.map((x: ChartType, i: number) => {
      return (
        <Chart key={i} chart={x} />
      )
    })
  }


  render() {
    return (
      <StyledChartList>
        {this.renderChartList()}
      </StyledChartList>
    );
  }
}

ChartList.contextType = Context;

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const StyledChartList = styled.div`
  padding-bottom: 100px;
`;