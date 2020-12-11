import React, { Component } from 'react';
import styled from 'styled-components';
import randomWords from 'random-words';
import _ from 'lodash';
import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import { PorterTemplate, ChoiceType, Cluster, StorageType } from '../../../../shared/types';
import Selector from '../../../../components/Selector';
import ImageSelector from '../../../../components/image-selector/ImageSelector';
import TabRegion from '../../../../components/TabRegion';
import ValuesForm from '../../../../components/values-form/ValuesForm';

type PropsType = {
  currentTemplate: any,
  hideLaunch: () => void,
  setCurrentView: (x: string) => void,
  values: any,
  form: any,
};

type StateType = {
  currentView: string,
  clusterOptions: { label: string, value: string }[],
  saveValuesStatus: string | null
  selectedNamespace: string,
  selectedCluster: string,
  selectedImageUrl: string | null,
  selectedTag: string | null,
  tabOptions: ChoiceType[],
  currentTab: string | null,
  tabContents: any
  namespaceOptions: { label: string, value: string }[],
};

export default class LaunchTemplate extends Component<PropsType, StateType> {
  state = {
    currentView: 'repo',
    clusterOptions: [] as { label: string, value: string }[],
    saveValuesStatus: null as (string | null),
    selectedCluster: this.context.currentCluster.name,
    selectedNamespace: "default",
    selectedImageUrl: '' as string | null,
    selectedTag: '' as string | null,
    tabOptions: [] as ChoiceType[],
    currentTab: null as string | null,
    tabContents: [] as any,
    namespaceOptions: [] as { label: string, value: string }[],
  };

  onSubmit = (rawValues: any) => {
    let { currentCluster, currentProject } = this.context;
    let name = randomWords({ exactly: 3, join: '-' });
    this.setState({ saveValuesStatus: 'loading' });

    // Convert dotted keys to nested objects
    let values = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    api.deployTemplate('<token>', {
      templateName: this.props.currentTemplate.name,
      imageURL: this.state.selectedImageUrl,
      storage: StorageType.Secret,
      formValues: values,
      namespace: this.state.selectedNamespace,
      name,
    }, {
      id: currentProject.id,
      cluster_id: currentCluster.id,
      name: this.props.currentTemplate.name.toLowerCase().trim(),
      version: 'latest',
    }, (err: any, res: any) => {
      if (err) {
        this.setState({ saveValuesStatus: 'error' });
      } else {
        this.setState({ saveValuesStatus: 'successful' });
      }
    });
  }

  renderTabContents = () => {
    return this.props.form.tabs.map((tab: any, i: number) => {

      // If tab is current, render
      if (tab.name === this.state.currentTab) {
        return (
          <ValuesFormWrapper key={i}>
            <ValuesForm 
              key={tab.name}
              sections={tab.sections} 
              onSubmit={this.onSubmit}
              disabled={false}
              // disabled={!this.state.selectedImageUrl || this.state.selectedImageUrl === ''}
              saveValuesStatus={this.state.saveValuesStatus}
            />
          </ValuesFormWrapper>
        );
      }
    });
  }

  componentDidMount() {

    // Retrieve tab options
    let tabOptions = [] as ChoiceType[];
    this.props.form.tabs.map((tab: any, i: number) => {
      tabOptions.push({ value: tab.name, label: tab.label });
    });
    this.setState({ tabOptions });

    // TODO: query with selected filter once implemented
    let { currentProject, currentCluster } = this.context;
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

    api.getNamespaces('<token>', {
      cluster_id: currentCluster.id,
    }, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        console.log(err)
      } else if (res.data) {
        let namespaceOptions = res.data.items.map((x: { metadata: {name: string}}) => { 
          return { label: x.metadata.name, value: x.metadata.name } 
        });
        if (res.data.items.length > 0) {
          this.setState({ namespaceOptions });
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
    let { name, icon, description } = this.props.form;
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
          <NamespaceLabel>
            <i className="material-icons">view_list</i>Namespace
          </NamespaceLabel>
          <Selector
            key={'namespace'}
            activeValue={this.state.selectedNamespace}
            setActiveValue={(namespace: string) => this.setState({ selectedNamespace: namespace })}
            options={this.state.namespaceOptions}
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

const NamespaceLabel = styled.div`
  margin-left: 15px;
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