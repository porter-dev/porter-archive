import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../shared/api';
import yaml from 'js-yaml';

import { ChartType, RepoType, StorageType } from '../../../../shared/types';
import { Context } from '../../../../shared/Context';

import ImageSelector from '../../../../components/image-selector/ImageSelector';
import SaveButton from '../../../../components/SaveButton';

type PropsType = {
  currentChart: ChartType,
  refreshChart: () => void,
  setCurrentView: (x: string) => void,
};

type StateType = {
  selectedImageUrl: string | null,
  selectedTag: string | null,
  saveValuesStatus: string | null,
  values: string,
};

export default class SettingsSection extends Component<PropsType, StateType> {
  state = {
    selectedImageUrl: '',
    selectedTag: '',
    values: '',
    saveValuesStatus: null as (string | null),
  }

  redeployWithNewImage = (img: string, tag: string) => {
    this.setState({saveValuesStatus: 'loading'})
    let { currentCluster, currentProject } = this.context;
    let image = {
      image: {
        repository: img,
        tag: tag,
      }
    }

    let values = yaml.dump(image);
    api.upgradeChartValues('<token>', {
      namespace: this.props.currentChart.namespace,
      storage: StorageType.Secret,
      values,
    }, {
      id: currentProject.id, 
      name: this.props.currentChart.name,
      cluster_id: currentCluster.id,
    }, (err: any, res: any) => {
      if (err) {
        console.log(err)
        this.setState({ saveValuesStatus: 'error' });
      } else {
        this.setState({ saveValuesStatus: 'successful' });
        this.props.refreshChart();
      }
    });
  }

  render() {
    return (
      <Wrapper>
        <StyledSettingsSection>
          <Subtitle>Connected source</Subtitle>
          <ImageSelector
            selectedImageUrl={this.state.selectedImageUrl}
            selectedTag={this.state.selectedTag}
            setSelectedImageUrl={(x: string) => this.setState({ selectedImageUrl: x })}
            setSelectedTag={(x: string) => this.setState({ selectedTag: x })}
            forceExpanded={true}
            setCurrentView={this.props.setCurrentView}
          />
        </StyledSettingsSection>
        <SaveButton
          text='Save Settings'
          onClick={() => this.redeployWithNewImage(this.state.selectedImageUrl, this.state.selectedTag)}
          status={this.state.saveValuesStatus}
          makeFlush={true}
          disabled={this.state.selectedImageUrl && this.state.selectedTag ? false : true}
        />
      </Wrapper>
    );
  }
}

SettingsSection.contextType = Context;

const Subtitle = styled.div`
  color: #aaaabb;
  font-size: 13px;
  margin-bottom: 15px;
  margin-top: 20px;
`;

const Heading = styled.div`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-top: 35px;
  margin-bottom: 22px;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const StyledSettingsSection = styled.div`
  width: 100%;
  height: calc(100% - 60px);
  background: #ffffff11;
  padding: 15px 35px 50px;
  position: relative;
  border-radius: 5px;
  overflow: auto;
`;