import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../shared/api';
import yaml from 'js-yaml';

import { ChartType, RepoType, StorageType } from '../../../../shared/types';
import { Context } from '../../../../shared/Context';

import ImageSelector from '../../../../components/image-selector/ImageSelector';
import RepoSelector from '../../../../components/repo-selector/RepoSelector';
import SaveButton from '../../../../components/SaveButton';
import Heading from '../../../../components/values-form/Heading';
import Helper from '../../../../components/values-form/Helper';
import InputRow from '../../../../components/values-form/InputRow';

type PropsType = {
  currentChart: ChartType,
  refreshChart: () => void,
  setCurrentView: (x: string) => void,
};

type StateType = {
  sourceType: string,
  selectedImageUrl: string | null,
  selectedTag: string | null,
  saveValuesStatus: string | null,
  values: string,
  selectedRepo: RepoType | null,
  selectedBranch: string,
  subdirectory: string,
};

export default class SettingsSection extends Component<PropsType, StateType> {
  state = {
    sourceType: 'registry',
    selectedImageUrl: '',
    selectedTag: '',
    values: '',
    saveValuesStatus: null as (string | null),
    selectedRepo: null as RepoType | null,
    selectedBranch: '',
    subdirectory: '',
  }

  // TODO: read in set image from form context instead of config
  componentDidMount() {
    let image = this.props.currentChart.config?.image;
    if (image?.repository && image.tag) {
      this.setState({ 
        selectedImageUrl: image.repository, 
        selectedTag: image.tag 
      });
    }
  }

  redeployWithNewImage = (img: string, tag: string) => {
    this.setState({ saveValuesStatus: 'loading' });
    let { currentCluster, currentProject } = this.context;

    // If tag is explicitly declared, parse tag
    let imgSplits = img.split(':');
    let parsedTag = null;
    if (imgSplits.length > 1) {
      img = imgSplits[0];
      parsedTag = imgSplits[1];
    }

    let image = {
      image: {
        repository: img,
        tag: parsedTag || tag,
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

  renderSourceSection = () => {
    if (this.state.sourceType === 'registry') {
      return (
        <>
          <Helper>
            Specify a container image and tag
            <Highlight onClick={() => this.setState({ sourceType: 'repo' })}>
              or link a repo
            </Highlight>.
          </Helper>
          <ImageSelector
            selectedImageUrl={this.state.selectedImageUrl}
            selectedTag={this.state.selectedTag}
            setSelectedImageUrl={(x: string) => this.setState({ selectedImageUrl: x })}
            setSelectedTag={(x: string) => this.setState({ selectedTag: x })}
            forceExpanded={true}
            setCurrentView={this.props.setCurrentView}
          />
        </>
      );
    }
    return (
      <>
        <Helper>
          Select a repo to conenct to
          <Highlight onClick={() => this.setState({ sourceType: 'registry' })}>
            or link a container registry
          </Highlight>.
        </Helper>
        <RepoSelector
          forceExpanded={true}
          selectedRepo={this.state.selectedRepo}
          selectedBranch={this.state.selectedBranch}
          subdirectory={this.state.subdirectory}
          setSelectedRepo={(x: RepoType) => this.setState({ selectedRepo: x })}
          setSelectedBranch={(x: string) => this.setState({ selectedBranch: x })}
          setSubdirectory={(x: string) => this.setState({ subdirectory: x })}
        />
      </>
    );
  }

  render() {
    return (
      <Wrapper>
        <StyledSettingsSection>
          <Heading>Connected source</Heading>
          {this.renderSourceSection()}
          <Heading>Redeploy Webhook</Heading>
          <Helper>Programmatically deploy by calling this secret webhook.</Helper>
          <Webhook>
            <div>https://api.getporter.dev/deploy/sdkdkalasdkfjdslk?commit=???</div>
            <i className="material-icons">content_copy</i>
          </Webhook>
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

const Webhook = styled.div`
  width: 100%;
  border: 1px solid #ffffff55;
  background: #ffffff11;
  border-radius: 3px;
  display: flex;
  align-items: center;
  font-size: 13px;
  padding-left: 10px;
  color: #aaaabb;
  height: 40px;
  position: relative;
  margin-bottom: 40px;

  > div {
    user-select: all;
  }
  
  > i {
    padding: 5px;
    background: #ffffff22;
    border-radius: 5px;
    position: absolute;
    right: 10px;
    font-size: 14px;
    cursor: pointer;

    :hover {
      background: #ffffff44;
    }
  }
`;

const Highlight = styled.div`
  color: #949effff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const StyledSettingsSection = styled.div`
  width: 100%;
  height: calc(100% - 60px);
  background: #ffffff11;
  padding: 0 35px;
  position: relative;
  border-radius: 5px;
  overflow: auto;
`;