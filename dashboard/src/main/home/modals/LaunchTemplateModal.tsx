import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../assets/close.png';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { Cluster, RepoType } from '../../../shared/types';

import SaveButton from '../../../components/SaveButton';
import Selector from '../../../components/Selector';
import RepoSelector from '../../../components/repo-selector/RepoSelector';
import ValuesForm from '../../../components/values-form/ValuesForm';

type PropsType = {
};

type StateType = {
  currentView: string,
  clusterOptions: { label: string, value: string }[],
  selectedCluster: string,
  selectedRepo: RepoType | null,
  selectedBranch: string,
  subdirectory: string,
};

export default class LaunchTemplateModal extends Component<PropsType, StateType> {
  state = {
    currentView: 'repo',
    clusterOptions: [] as { label: string, value: string }[],
    selectedCluster: this.context.currentCluster.name,
    selectedRepo: null as RepoType | null,
    selectedBranch: '',
    subdirectory: '',
  };
  
  componentDidMount() {
    let { currentProject } = this.context;

    // TODO: query with selected filter once implemented
    api.getClusters('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        // console.log(err)
      } else if (res.data) {
        let clusterOptions = res.data.map((x: Cluster) => { return { label: x.name, value: x.name } });
        if (res.data.length > 0) {
          this.setState({ clusterOptions });
        }
      }
    });
  }

  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />
    }

    return (
      <Polymer><i className="material-icons">layers</i></Polymer>
    );
  }

  renderContents = () => {
    if (this.state.currentView === 'repo') {
      return (
        <div>
          <Subtitle>Select the source and branch you would like to use</Subtitle>
          <RepoSelector
            forceExpanded={true}
            selectedRepo={this.state.selectedRepo}
            selectedBranch={this.state.selectedBranch}
            subdirectory={this.state.subdirectory}
            setSelectedRepo={(selectedRepo: RepoType) => this.setState({ selectedRepo })}
            setSelectedBranch={(selectedBranch: string) => this.setState({ selectedBranch })}
            setSubdirectory={(subdirectory: string) => this.setState({ subdirectory })}
          />
          <SaveButton
            disabled={this.state.selectedBranch === ''}
            text='Continue'
            onClick={() => this.setState({ currentView: 'values'})}
          />
        </div>
      );
    }

    let subdir = this.state.subdirectory === '' ? '' : '/' + this.state.subdirectory;
    return (
      <Div>
        <Subtitle>Optionally edit default settings for this template</Subtitle>
        <ValuesFormWrapper>
          <ValuesForm
            formData={this.context.currentModalData.template.Form}
          />
        </ValuesFormWrapper>
        <RepoButton onClick={() => this.setState({ currentView: 'repo' })}>
          <i className="material-icons">keyboard_backspace</i>
          {this.state.selectedRepo.FullName + subdir}
        </RepoButton>
      </Div>
    );
  }

  render() {
    let { currentModalData } = this.context;
    if (currentModalData) {
      let { Name, Icon, Description } = currentModalData.template.Form;
      let name = Name ? Name : currentModalData.template.Name;

      return (
        <StyledClusterConfigModal>
          <CloseButton onClick={() => {
            this.context.setCurrentModal(null, null);
          }}>
            <CloseButtonImg src={close} />
          </CloseButton>

          <ModalTitle>Launch Template</ModalTitle>
          <ClusterSection>
            <Template>
              {Icon ? this.renderIcon(Icon) : this.renderIcon(currentModalData.template.Icon)}
              {name}
            </Template>
            <i className="material-icons">arrow_right_alt</i>
            <ClusterLabel>
              <i className="material-icons">device_hub</i>Cluster
            </ClusterLabel>
            <Selector
              activeValue={this.state.selectedCluster}
              setActiveValue={(cluster: string) => this.setState({ selectedCluster: cluster })}
              options={this.state.clusterOptions}
              width='250px'
              dropdownWidth='335px'
              closeOverlay={true}
            />
          </ClusterSection>
          {this.renderContents()}
        </StyledClusterConfigModal>
      );
    }
    return null;
  }
}

LaunchTemplateModal.contextType = Context;

const RepoButton = styled.div`
  height: 40px;
  font-size: 13px;
  padding: 6px 20px 7px 13px;
  border-radius: 5px;
  background: #ffffff11;
  color: #ffffff;
  border: 1px solid #ffffff55;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  position: absolute;
  bottom: 25px;
  left: 30px;
  :hover {
    background: #ffffff22;
  }

  > i {
    font-size: 16px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const Div = styled.div`
  width: calc(100% + 64px);
  margin-left: -32px;
  height: calc(100% - 50px);
  position: relative;
  padding: 0 32px;
`;

const ValuesFormWrapper = styled.div`
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: 100%;
  height: calc(100% - 149px);
`;

const ClusterLabel = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
  > i {
    font-size: 16px;
    margin-right: 6px;
  }
`;

const Icon = styled.img`
  width: 21px;
  margin-right: 10px;
`;


const Polymer = styled.div`
  margin-bottom: -3px;

  > i {
    color: ${props => props.theme.containerIcon};
    font-size: 18px;
    margin-right: 10px;
  }
`;

const Template = styled.div`
  display: flex;
  align-items: center;
  margin-right: 13px;
`;

const ClusterSection = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-family: 'Work Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  margin-top: 20px;

  > i {
    font-size: 25px;
    color: #ffffff44;
    margin-right: 13px;
  }
`;

const Subtitle = styled.div`
  padding: 17px 0px 25px;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  color: #aaaabb;
  margin-top: 3px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: 'Assistant';
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
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

const StyledClusterConfigModal= styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 32px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;