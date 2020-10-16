import React, { Component } from 'react';
import styled from 'styled-components';
import yaml from 'js-yaml';

import { ChartType, StorageType } from '../../../../shared/types';
import api from '../../../../shared/api';
import { Context } from '../../../../shared/Context';

import YamlEditor from '../../../../components/YamlEditor';
import SaveButton from '../../../../components/SaveButton';

type PropsType = {
  currentChart: ChartType
  refreshChart: () => void
};

type StateType = {
  values: string,
  saveValuesStatus: string | null
};

export default class ValuesYaml extends Component<PropsType, StateType> {
  state = {
    values: '',
    saveValuesStatus: null as (string | null)
  }

  updateValues() {
    let values = yaml.dump(this.props.currentChart.config);
    this.setState({ values });
  }

  componentDidMount() {
    this.updateValues();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (this.props.currentChart !== prevProps.currentChart) {
      this.updateValues();
    }
  }

  handleSaveValues = () => {
    let { currentCluster, setCurrentError } = this.context;
    this.setState({ saveValuesStatus: 'loading' });

    api.upgradeChartValues('<token>', {
      namespace: this.props.currentChart.namespace,
      context: currentCluster,
      storage: StorageType.Secret,
      values: this.state.values
    }, { name: this.props.currentChart.name }, (err: any, res: any) => {
      if (err) {
        setCurrentError(err.response.data.errors[0]);
        this.setState({ saveValuesStatus: 'error ' });
      } else {
        this.setState({ saveValuesStatus: 'successful' });
        this.props.refreshChart();
      }
    });
  }

  render() {
    return (
      <StyledValuesYaml>
        <Wrapper>
          <YamlEditor
            value={this.state.values}
            onChange={(e: any) => this.setState({ values: e })}
          />
        </Wrapper>
        <SaveButton
          text='Update Values'
          onClick={this.handleSaveValues}
          status={this.state.saveValuesStatus}
        />
      </StyledValuesYaml>
    );
  }
}

ValuesYaml.contextType = Context;

const Wrapper = styled.div`
  overflow: auto;
  height: calc(100% - 60px);
  border-radius: 5px;
  border: 1px solid #ffffff22;
`;

const StyledValuesYaml = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;