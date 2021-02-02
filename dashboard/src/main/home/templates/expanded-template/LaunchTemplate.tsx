import React, { Component } from 'react';
import styled from 'styled-components';
import randomWords from 'random-words';
import posthog from 'posthog-js';
import _ from 'lodash';
import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import { PorterTemplate, ChoiceType, ClusterType, StorageType } from '../../../../shared/types';
import Selector from '../../../../components/Selector';
import ImageSelector from '../../../../components/image-selector/ImageSelector';
import TabRegion from '../../../../components/TabRegion';
import InputRow from '../../../../components/values-form/InputRow';
import SaveButton from '../../../../components/SaveButton';
import ValuesWrapper from '../../../../components/values-form/ValuesWrapper';
import ValuesForm from '../../../../components/values-form/ValuesForm';
import { isAlphanumeric } from '../../../../shared/common';
import { safeDump } from 'js-yaml';

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
  templateName: string,
  tabOptions: ChoiceType[],
  currentTab: string | null,
  tabContents: any
  namespaceOptions: { label: string, value: string }[],
};

export default class LaunchTemplate extends Component<PropsType, StateType> {
  state = {
    currentView: 'repo',
    clusterOptions: [] as { label: string, value: string }[],
    saveValuesStatus: 'No container image specified' as (string | null),
    selectedCluster: this.context.currentCluster.name,
    selectedNamespace: "default",
    selectedImageUrl: '' as string | null,
    templateName: '',
    selectedTag: '' as string | null,
    tabOptions: [] as ChoiceType[],
    currentTab: null as string | null,
    tabContents: [] as any,
    namespaceOptions: [] as { label: string, value: string }[],
  };

  onSubmitAddon = (wildcard?: any) => {
    let { currentCluster, currentProject } = this.context;
    let name = this.state.templateName || randomWords({ exactly: 3, join: '-' });
    this.setState({ saveValuesStatus: 'loading' });

    let values = {};
    for (let key in wildcard) {
      _.set(values, key, wildcard[key]);
    }

    api.deployTemplate('<token>', {
      templateName: this.props.currentTemplate.name,
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
        posthog.capture('Failed to deploy template', {
          name: this.props.currentTemplate.name,
          namespace: this.state.selectedNamespace,
          values: values,
          error: err
        })
      } else {
        // this.props.setCurrentView('cluster-dashboard');
        this.setState({ saveValuesStatus: 'successful' });
        posthog.capture('Deployed template', {
          name: this.props.currentTemplate.name,
          namespace: this.state.selectedNamespace,
          values: values,
        })
      }
    });
  }

  onSubmit = (rawValues: any) => {
    let { currentCluster, currentProject } = this.context;
    let name = this.state.templateName || randomWords({ exactly: 3, join: '-' });
    this.setState({ saveValuesStatus: 'loading' });

    // Convert dotted keys to nested objects
    let values = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    let imageUrl = this.state.selectedImageUrl;
    let tag = this.state.selectedTag;

    if (this.state.selectedImageUrl.includes(':')) {
      let splits = this.state.selectedImageUrl.split(':');
      imageUrl = splits[0];
      tag = splits[1];
    } else if (!tag) {
      tag = 'latest';
    }

    _.set(values, "image.repository", imageUrl)
    _.set(values, "image.tag", tag)

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
        posthog.capture('Failed to deploy template', {
          name: this.props.currentTemplate.name,
          namespace: this.state.selectedNamespace,
          values: values,
          error: err
        })
      } else {
        // this.props.setCurrentView('cluster-dashboard');
        this.setState({ saveValuesStatus: 'successful' });
        posthog.capture('Deployed template', {
          name: this.props.currentTemplate.name,
          namespace: this.state.selectedNamespace,
          values: values,
        })
      }
    });
  }

  renderTabContents = () => {
    return (
      <ValuesWrapper
        formTabs={this.props.form?.tabs}
        onSubmit={this.props.currentTemplate.name === 'docker' ? this.onSubmit : this.onSubmitAddon}
        saveValuesStatus={this.state.saveValuesStatus}
        disabled={
          (this.state.templateName.length > 0 && !isAlphanumeric(this.state.templateName))
          || (this.props.form?.hasSource ? !this.state.selectedImageUrl : false)
        }
      >
        {(metaState: any, setMetaState: any) => {
          return this.props.form?.tabs.map((tab: any, i: number) => {

            // If tab is current, render
            if (tab.name === this.state.currentTab) {
              return (
                <ValuesForm 
                  metaState={metaState}
                  setMetaState={setMetaState}
                  key={tab.name}
                  sections={tab.sections} 
                />
              );
            }
          });
        }}
      </ValuesWrapper>
    );
  }

  componentDidMount() {
    if (this.props.currentTemplate.name !== 'docker') {
      this.setState({ saveValuesStatus: '' });
    }

    // Retrieve tab options
    let tabOptions = [] as ChoiceType[];
    this.props.form?.tabs.map((tab: any, i: number) => {
      if (tab.context.type === 'helm/values') {
        tabOptions.push({ value: tab.name, label: tab.label });
      }
    });
    this.setState({ tabOptions });

    // TODO: query with selected filter once implemented
    let { currentProject, currentCluster } = this.context;
    api.getClusters('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        // console.log(err)
      } else if (res.data) {
        let clusterOptions = res.data.map((x: ClusterType) => { return { label: x.name, value: x.name } });
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

  setSelectedImageUrl = (x: string) => {
    if (x === '') {
      this.setState({ saveValuesStatus: 'No container image specified' });
    } else {
      this.setState({ saveValuesStatus: '' });
    }
    this.setState({ selectedImageUrl: x });
  }

  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />
    }

    return (
      <Polymer><i className="material-icons">layers</i></Polymer>
    );
  }

  renderTabRegion = () => {
    if (this.state.tabOptions.length > 0) {
      return (
        <>
          <Subtitle>Configure additional settings for this template. (Optional)</Subtitle>
          <TabRegion
            options={this.state.tabOptions}
            currentTab={this.state.currentTab}
            setCurrentTab={(x: string) => this.setState({ currentTab: x })}
          >
            {this.renderTabContents()}
          </TabRegion>
        </>
      );
    } else {
      return (
        <Wrapper>
          <Placeholder>
            To configure this chart through Porter, 
            <Link 
              target='_blank'
              href='https://docs.getporter.dev/docs/porter-templates'
            >
              refer to our docs
            </Link>.
          </Placeholder>
          <SaveButton
            text='Deploy'
            onClick={() => this.onSubmitAddon()}
            status={this.state.saveValuesStatus}
            makeFlush={true}
          />
        </Wrapper>
      );
    }
  }

  // Display if current template uses source (image or repo)
  renderSourceSelector = () => {
    if (this.props.form?.hasSource) {
      return (
        <>
          <Subtitle>
            Select the container image you would like to connect to this template.
            <Required>*</Required>
          </Subtitle>
          <DarkMatter />
          <ImageSelector
            selectedTag={this.state.selectedTag}
            selectedImageUrl={this.state.selectedImageUrl}
            setSelectedImageUrl={this.setSelectedImageUrl}
            setSelectedTag={(x: string) => this.setState({ selectedTag: x })}
            forceExpanded={true}
            setCurrentView={this.props.setCurrentView}
          />
          <br />
        </>
      );
    }
  }

  render() {
    let { name, icon } = this.props.currentTemplate;
    let { currentTemplate } = this.props;

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
        <Subtitle>Template name
          <Warning highlight={!isAlphanumeric(this.state.templateName) && this.state.templateName !== ''}>
            (lowercase letters, numbers, and "-" only)
          </Warning>. (Optional)
        </Subtitle>
        <DarkMatter antiHeight='-27px' />
        <InputRow
          type='text'
          value={this.state.templateName}
          setValue={(x: string) => this.setState({ templateName: x })}
          placeholder='ex: doctor-scientist'
          width='100%'
        />
        {this.renderSourceSelector()}
        {this.renderTabRegion()}
      </StyledLaunchTemplate>
    );
  }
}

LaunchTemplate.contextType = Context;

const Warning = styled.span<{ highlight: boolean, makeFlush?: boolean }>`
  color: ${props => props.highlight ? '#f5cb42' : ''};
  margin-left: ${props => props.makeFlush ? '' : '5px'};
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
`;

const Link = styled.a`
  margin-left: 5px;
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 35px 0px 35px;
`;

const Wrapper = styled.div`
  width: 100%;
  position: relative;
  padding-top: 20px;
  padding-bottom: 70px;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 200px;
  background: #ffffff11;
  border: 1px solid #ffffff44;
  border-radius: 5px;
  color: #aaaabb;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${props => props.antiHeight || '-15px'};
`;

const Subtitle = styled.div`
  padding: 11px 0px 20px;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
  display: flex;
  align-items: center;
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