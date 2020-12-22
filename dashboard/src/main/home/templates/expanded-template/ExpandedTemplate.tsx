import React, { Component } from 'react';
import styled from 'styled-components';

import { PorterTemplate } from '../../../../shared/types';
import api from '../../../../shared/api';

import TemplateInfo from './TemplateInfo';
import LaunchTemplate from './LaunchTemplate';
import Loading from '../../../../components/Loading';

type PropsType = {
  currentTemplate: PorterTemplate,
  setCurrentTemplate: (x: PorterTemplate) => void,
  setCurrentView: (x: string) => void,
};

type StateType = {
  showLaunchTemplate: boolean,
  form: any | null,
  values: any | null,
  loading: boolean,
  error: boolean,
  markdown: string | null,
  keywords: string[],
};

export default class ExpandedTemplate extends Component<PropsType, StateType> {
  state = {
    showLaunchTemplate: false,
    form: null as any | null,
    values: null as any | null,
    loading: true,
    error: false,
    markdown: null as string | null,
    keywords: [] as string[],
  }

  componentDidMount() {
    this.setState({ loading: true });
    api.getTemplateInfo('<token>', {}, {
      name: this.props.currentTemplate.name.toLowerCase().trim(),
      version: 'latest',
    }, (err: any, res: any) => {
      if (err) {
        this.setState({ loading: false, error: true });
      } else {
        let { form, values, markdown, metadata } = res.data;
        let keywords = metadata.keywords;
        this.setState({ form, values, markdown, keywords, loading: false, error: false });
      }
    });
  }

  renderContents = () => {
      if (this.state.loading) {
        return <LoadingWrapper><Loading /></LoadingWrapper>;
      }
    if (this.state.showLaunchTemplate) {
      return (
        <LaunchTemplate
          currentTemplate={this.props.currentTemplate}
          hideLaunch={() => this.setState({ showLaunchTemplate: false })}
          setCurrentView={this.props.setCurrentView}
          values={this.state.values}
          form={this.state.form}
        />
      );
    }

    return (
      <FadeWrapper>
        <TemplateInfo
          currentTemplate={this.props.currentTemplate}
          setCurrentTemplate={this.props.setCurrentTemplate}
          launchTemplate={() => this.setState({ showLaunchTemplate: true })}
          markdown={this.state.markdown}
          keywords={this.state.keywords}
        />
      </FadeWrapper>
    );
  }

  render() {
    return (
      <StyledExpandedTemplate>
        {this.renderContents()}
      </StyledExpandedTemplate>
    );
  }
}

const FadeWrapper = styled.div`
  animation: fadeIn 0.2s;
  @keyframes fadeIn {
    from: { opacity: 0 }
    to: { opacity: 1 }
  }
`;

const LoadingWrapper = styled.div`
  height: calc(100vh - 200px);
  width: 100%;
`;

const StyledExpandedTemplate = styled.div`
  width: calc(90% - 150px);
  min-width: 300px;
  padding-top: 50px;
`;