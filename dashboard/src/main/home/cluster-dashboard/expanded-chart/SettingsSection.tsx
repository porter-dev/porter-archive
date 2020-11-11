import React, { Component } from 'react';
import styled from 'styled-components';

import { RepoType } from '../../../../shared/types';

import RepoSelector from '../../../../components/repo-selector/RepoSelector';
import SaveButton from '../../../../components/SaveButton';

type PropsType = {
};

type StateType = {
  selectedRepo: RepoType | null,
  selectedBranch: string,
  subdirectory: string,
};

export default class SettingsSection extends Component<PropsType, StateType> {
  state = {
    selectedRepo: null as RepoType | null,
    selectedBranch: '',
    subdirectory: '',
  }

  render() {
    return (
      <Wrapper>
        <StyledSettingsSection>
          <Subtitle>Connected source</Subtitle>
          <RepoSelector
            selectedRepo={this.state.selectedRepo}
            selectedBranch={this.state.selectedBranch}
            subdirectory={this.state.subdirectory}
            setSelectedRepo={(selectedRepo: RepoType) => this.setState({ selectedRepo })}
            setSelectedBranch={(selectedBranch: string) => this.setState({ selectedBranch })}
            setSubdirectory={(subdirectory: string) => this.setState({ subdirectory })}
          />
        </StyledSettingsSection>
        <SaveButton
          text='Save Settings'
          onClick={() => console.log(this.state)}
          status={null}
        />
      </Wrapper>
    );
  }
}

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