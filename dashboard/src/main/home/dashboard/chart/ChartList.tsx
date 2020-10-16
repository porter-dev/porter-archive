import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';
import { ChartType, StorageType } from '../../../../shared/types';

import Chart from './Chart';
import Loading from '../../../../components/Loading';

type PropsType = {
  currentCluster: string,
  namespace: string,
  setCurrentChart: (c: ChartType) => void
};

type StateType = {
  charts: ChartType[],
  loading: boolean,
  error: boolean
};

export default class ChartList extends Component<PropsType, StateType> {
  state = {
    charts: [] as ChartType[],
    loading: false,
    error: false,
  }

  updateCharts = () => {
    let { currentCluster } = this.context;

    this.setState({ loading: true });
    setTimeout(() => {
      if (this.state.loading) {
        this.setState({ loading: false, error: true });
      }
    }, 2000);

    api.getCharts('<token>', {
      namespace: this.props.namespace,
      context: currentCluster,
      storage: StorageType.Secret,
      limit: 20,
      skip: 0,
      byDate: false,
      statusFilter: ['deployed']
    }, {}, (err: any, res: any) => {
      if (err) {
        // setCurrentError(JSON.stringify(err));
        this.setState({ loading: false, error: true });
      } else {
        if (res.data) {
          this.setState({ charts: res.data });
        } else {
          this.setState({ charts: [] });
        }
        this.setState({ loading: false, error: false });
      }
    });
  }

  componentDidMount() {
    this.updateCharts();
  }

  componentDidUpdate(prevProps: PropsType) {

    // Ret2: Prevents reload when opening ClusterConfigModal
    if (prevProps.currentCluster !== this.props.currentCluster || 
      prevProps.namespace !== this.props.namespace) {
      this.updateCharts();
    }
  }

  renderChartList = () => {
    let { loading, error, charts } = this.state;

    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error) {
      return (
        <Placeholder>
          <i className="material-icons">error</i> Error connecting to cluster.
        </Placeholder>
      );
    } else if (charts.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i> No charts found in this namespace.
        </Placeholder>
      );
    }

    return this.state.charts.map((x: ChartType, i: number) => {
      return (
        <Chart
          key={i}
          chart={x}
          setCurrentChart={this.props.setCurrentChart}
        />
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

const Placeholder = styled.div`
  padding-top: 100px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const StyledChartList = styled.div`
  padding-bottom: 100px;
`;