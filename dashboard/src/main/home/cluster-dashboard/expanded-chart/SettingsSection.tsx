import React, { Component } from 'react';
import styled from 'styled-components';

import { RepoType } from '../../../../shared/types';

import ImageSelector from '../../../../components/image-selector/ImageSelector';
import SaveButton from '../../../../components/SaveButton';

type PropsType = {
};

type StateType = {
  selectedImageUrl: string | null,
};

export default class SettingsSection extends Component<PropsType, StateType> {
  state = {
    selectedImageUrl: '',
  }

  render() {
    return (
      <Wrapper>
        <StyledSettingsSection>
          <Subtitle>Connected source</Subtitle>
          <ImageSelector
            selectedImageUrl={this.state.selectedImageUrl}
            setSelectedImageUrl={(x: string) => this.setState({ selectedImageUrl: x })}
            forceExpanded={true}
          />
        </StyledSettingsSection>
        <SaveButton
          text='Save Settings'
          onClick={() => console.log(this.state)}
          status={null}
          makeFlush={true}
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