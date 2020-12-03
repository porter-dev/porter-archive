import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import { PorterChart, ChoiceType, Cluster, StorageType } from '../../../../shared/types';
import Selector from '../../../../components/Selector';
import ImageSelector from '../../../../components/image-selector/ImageSelector';
import TabRegion from '../../../../components/TabRegion';
import ValuesForm from '../../../../components/values-form/ValuesForm';

type PropsType = {
  currentTemplate: PorterChart,
  hideLaunch: () => void,
  setCurrentView: (x: string) => void,
};

type StateType = {
  currentView: string,
  clusterOptions: { label: string, value: string }[],
  selectedCluster: string,
  selectedImageUrl: string | null,
  selectedTag: string | null,
  tabOptions: ChoiceType[],
  currentTab: string | null,
};

export default class LaunchTemplate extends Component<PropsType, StateType> {
  state = {
    currentView: 'repo',
    clusterOptions: [] as { label: string, value: string }[],
    selectedCluster: this.context.currentCluster.name,
    selectedImageUrl: '' as string | null,
    selectedTag: '' as string | null,
    tabOptions: [] as ChoiceType[],
    currentTab: null as string | null,
  };

  onSubmit = (formValues: any) => {
    let { currentCluster, currentProject } = this.context;
    api.deployTemplate('<token>', {
      templateName: this.props.currentTemplate.name,
      imageURL: "index.docker.io/bitnami/redis",
      storage: StorageType.Secret,
      formValues,
    }, {
      id: currentProject.id,
      cluster_id: currentCluster.id,
    }, (err: any, res: any) => {
      if (err) {
        console.log(err)
      } else {
        console.log(res.data)
      }
    });
  }

  renderTabContents = () => {
    return this.props.currentTemplate.form.tabs.map((tab: any, i: number) => {

      // If tab is current, render
      if (tab.name === this.state.currentTab) {
        return (
          <ValuesFormWrapper>
            <ValuesForm 
              sections={tab.sections} 
              onSubmit={this.onSubmit}
            />
          </ValuesFormWrapper>
        );
      }
    });
  }

  componentDidMount() {

    // Retrieve tab options
    let tabOptions = [] as ChoiceType[];
    this.props.currentTemplate.form.tabs.map((tab: any, i: number) => {
      tabOptions.push({ value: tab.name, label: tab.label });
    });
    this.setState({ tabOptions });

    // TODO: query with selected filter once implemented
    let { currentProject } = this.context;
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

  render() {
    let { name, icon, description } = this.props.currentTemplate.form;
    let { currentTemplate } = this.props;
    name = name ? name : currentTemplate.name;

    return (
      <StyledLaunchTemplate>
        <TitleSection>
          <Flex>
            <i className="material-icons" onClick={this.props.hideLaunch}>
              keyboard_backspace
            </i>
            <Title>Launch Template</Title>
          </Flex>
        </TitleSection>
        <ClusterSection>
          <Template>
            {icon ? this.renderIcon(icon) : this.renderIcon(currentTemplate.icon)}
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

        <Subtitle>Select the container image you would like to connect to this template (optional).</Subtitle>
        <Br />
        <ImageSelector
          selectedTag={this.state.selectedTag}
          selectedImageUrl={this.state.selectedImageUrl}
          setSelectedImageUrl={(x: string) => this.setState({ selectedImageUrl: x })}
          setSelectedTag={(x: string) => this.setState({ selectedTag: x })}
          forceExpanded={true}
          setCurrentView={this.props.setCurrentView}
        />

        <br />
        <Subtitle>Configure additional settings for this template (optional).</Subtitle>
        <TabRegion
          options={this.state.tabOptions}
          currentTab={this.state.currentTab}
          setCurrentTab={(x: string) => this.setState({ currentTab: x })}
        >
          {this.renderTabContents()}
        </TabRegion>
      </StyledLaunchTemplate>
    );
  }
}

LaunchTemplate.contextType = Context;

const ValuesFormWrapper = styled.div`
  width: 100%;
  height: calc(100% + 65px);
  padding-bottom: 65px;
`;

const Br = styled.div`
  width: 100%;
  height: 7px;
`;

const Subtitle = styled.div`
  padding: 11px 0px 20px;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  color: #aaaabb;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
  margin-bottom: 15px;

  > i {
    font-size: 25px;
    color: #ffffff44;
    margin-right: 13px;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    padding: 3px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: 'Work Sans', sans-serif;
  margin-left: 11px;
  border-radius: 2px;
  color: #ffffff;
`;

const TitleSection = styled.div`
  display: flex;
  margin-left: -42px;
  height: 40px;
  flex-direction: row;
  justify-content: space-between;
  width: calc(100% + 42px);
  align-items: center;
`;

const StyledLaunchTemplate = styled.div`
  width: 100%;
  padding-bottom: 150px;
`;