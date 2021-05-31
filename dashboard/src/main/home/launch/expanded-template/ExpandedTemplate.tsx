import React, { Component } from "react";
import styled from "styled-components";

import { PorterTemplate } from "shared/types";
import api from "shared/api";

import TemplateInfo from "./TemplateInfo";
import Loading from "components/Loading";

type PropsType = {
  currentTemplate: PorterTemplate;
  currentTab: string;
  setCurrentTemplate: (x: PorterTemplate) => void;
  skipDescription?: boolean;
  showLaunchFlow: () => void;
  setForm: (x: any) => void;
};

type StateType = {
  showLaunchTemplate: boolean;
  form: any | null;
  values: any | null;
  loading: boolean;
  error: boolean;
  markdown: string | null;
  keywords: string[];
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
  };

  componentDidMount() {
    this.fetchTemplateInfo();
  }

  fetchTemplateInfo = () => {
    this.setState({ loading: true });
    let params =
      this.props.currentTab == "porter"
        ? { repo_url: process.env.APPLICATION_CHART_REPO_URL }
        : { repo_url: process.env.ADDON_CHART_REPO_URL };

    api
      .getTemplateInfo("<token>", params, {
        name: this.props.currentTemplate.name.toLowerCase().trim(),
        version: this.props.currentTemplate.currentVersion,
      })
      .then((res) => {
        let { form, values, markdown, metadata } = res.data;
        let keywords = metadata.keywords;
        this.props.setForm(form);
        this.setState({
          values,
          markdown,
          keywords,
          loading: false,
          error: false,
        });
      })
      .catch((err) => this.setState({ loading: false, error: true }));
  };

  componentDidUpdate = (prevProps: PropsType) => {
    if (
      prevProps.currentTemplate.name !== this.props.currentTemplate.name ||
      prevProps.currentTemplate.currentVersion !==
        this.props.currentTemplate.currentVersion
    ) {
      this.fetchTemplateInfo();
    }
  };

  renderContents = () => {
    if (this.state.loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    }

    return (
      <FadeWrapper>
        <TemplateInfo
          currentTab={this.props.currentTab}
          currentTemplate={this.props.currentTemplate}
          setCurrentTemplate={this.props.setCurrentTemplate}
          setCurrentVersion={(version) => {
            let template = {
              ...this.props.currentTemplate,
              currentVersion: version,
            };

            this.props.setCurrentTemplate(template);
          }}
          launchTemplate={this.props.showLaunchFlow}
          markdown={this.state.markdown}
          keywords={this.state.keywords}
        />
      </FadeWrapper>
    );
  };

  render() {
    return (
      <StyledExpandedTemplate>{this.renderContents()}</StyledExpandedTemplate>
    );
  }
}

const FadeWrapper = styled.div`
  animation: fadeIn 0.2s;
  @keyframes fadeIn {
    from: {
      opacity: 0;
    }
    to: {
      opacity: 1;
    }
  }
`;

const LoadingWrapper = styled.div`
  height: calc(100vh - 200px);
  width: 100%;
`;

const StyledExpandedTemplate = styled.div`
  width: 100%;
  min-width: 300px;
  padding-top: 30px;
`;
