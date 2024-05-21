import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { ChartTypeWithExtendedConfig, PorterTemplate, ClusterType } from "shared/types";

import TabSelector from "components/TabSelector";
import ExpandedTemplate from "./expanded-template/ExpandedTemplate";
import Loading from "components/Loading";
import LaunchFlow from "./launch-flow/LaunchFlow";
import NoClusterPlaceholder from "../NoClusterPlaceholder";
import TitleSection from "components/TitleSection";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";

import semver from "semver";
import { RouteComponentProps, withRouter } from "react-router";
import { getQueryParam, getQueryParams, pushFiltered } from "shared/routing";
import TemplateList from "./TemplateList";
import { capitalize } from "lodash";
import Spacer from "components/porter/Spacer";
import Fieldset from "components/porter/Fieldset";
import Text from "components/porter/Text";
import Container from "components/porter/Container";

const initialTabOptions = [
  { label: "New application", value: "porter" },
  { label: "Community add-ons", value: "community" },
];

type TabOption = {
  label: string;
  value: string;
};

const HIDDEN_CHARTS = [
  "ack-chart",
  "apigatewayv2-chart",
  "applicationautoscaling-chart",
  "aws-cloudwatch-metrics",
  "cloudtrail-chart",
  "dynamodb-chart",
  "ec2-chart",
  "ecr-chart",
  "eks-chart",
  "elasticache-chart",
  "emrcontainers-chart",
  "eventbridge-chart",
  "iam-chart",
  "kms-chart",
  "lambda-chart",
  "loki",
  "memorydb-chart",
  "pipes-chart",
  "porter-agent",
  "prometheusservice-chart",
  "rds-chart",
  "s3-chart",
  "sagemaker-chart",
  "sfn-chart",
  "sns-chart",
  "sqs-chart",
];

type PropsType = RouteComponentProps & {};

type StateType = {
  currentTemplate: PorterTemplate | null;
  form: any;
  currentTab: string;
  addonTemplates: PorterTemplate[];
  applicationTemplates: PorterTemplate[];
  loading: boolean;
  error: boolean;
  isOnLaunchFlow: boolean;
  clonedChart: ChartTypeWithExtendedConfig;
  tabOptions: TabOption[];
  readyClusterStatus: string;
};
class Templates extends Component<PropsType, StateType> {
  private previousContext: any;

  state = {
    currentTemplate: null as PorterTemplate | null,
    form: null as any,
    currentTab: "porter",
    addonTemplates: [] as PorterTemplate[],
    applicationTemplates: [] as PorterTemplate[],
    loading: true,
    error: false,
    isOnLaunchFlow: false,
    clonedChart: null as ChartTypeWithExtendedConfig,
    tabOptions: initialTabOptions,
    readyClusterStatus: "checking",
  };

  componentDidMount() {
    this.previousContext = this.context;
    this.setTemplatesAndRepos();
  }

  componentDidUpdate() {
    // if project ID has changed, load in a new set of templates
    if (
      this.context.currentProject?.id != this.previousContext.currentProject?.id
    ) {
      this.setTemplatesAndRepos();
    }

    this.previousContext = this.context;
  }

  setTemplatesAndRepos = async () => {
    // if the project ID is not defined, return
    if (!this.context.currentProject) {
      return;
    }

    // Block launch tab on initial provisioning
    api.getClusters(
      "<token>",
      {},
      { id: this.context.currentProject.id },
    )
      .then(({ data }) => {
        let numUnavailable = 0;
        data.forEach((cluster: ClusterType) => {
          if (cluster.status === "UPDATING_UNAVAILABLE") {
            numUnavailable += 1;
          }
        });

        if (data.length === 0) {
          this.setState({ readyClusterStatus: "onboarding" });
        } else if (numUnavailable === data.length) {
          this.setState({ readyClusterStatus: "none-ready" });
        } else {
          this.setState({ readyClusterStatus: "has-ready" });
        }
      })
      .catch((err) => {
        console.error(err);
      });

    let default_addon_helm_repo_url = this.context?.capabilities
      ?.default_addon_helm_repo_url;
    let default_app_helm_repo_url = this.context?.capabilities
      ?.default_app_helm_repo_url;
    try {
      const res = await api.getTemplates(
        "<token>",
        {
          repo_url: default_addon_helm_repo_url,
        },
        {
          project_id: this.context.currentProject.id,
        }
      );
      let sortedVersionData = res.data.map((template: any) => {
        let versions = template.versions.reverse();

        versions = template.versions.sort(semver.rcompare);

        return {
          ...template,
          versions,
          currentVersion: versions[0],
        };
      });
      sortedVersionData.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
      sortedVersionData = sortedVersionData.filter(
        (template: any) => !HIDDEN_CHARTS.includes(template?.name)
      );
      this.setState({ addonTemplates: sortedVersionData, error: false });
    } catch (error) {
      this.setState({ loading: false, error: true });
    }
    try {
      const res = await api.getTemplates(
        "<token>",
        {
          repo_url: default_app_helm_repo_url,
        },
        {
          project_id: this.context.currentProject.id,
        }
      );
      let sortedVersionData = res.data.map((template: any) => {
        let versions = template.versions.reverse();

        versions = template.versions.sort(semver.rcompare);

        return {
          ...template,
          versions,
          currentVersion: versions[0],
        };
      });

      let currentTemplate = null;
      let isOnLaunchFlow = false;
      let form = null;
      let clonedChart = null;
      if (this.isTryingToClone() && this.areCloneQueryParamsValid()) {
        isOnLaunchFlow = true;
        const template_name = getQueryParam(this.props, "release_type");
        const version = getQueryParam(this.props, "release_template_version");
        currentTemplate = sortedVersionData.find(
          (v: any) => v.name === template_name
        );
        if (currentTemplate.versions.find((v: any) => v === version)) {
          currentTemplate.currentVersion = version;
        }
        const release = await this.getClonedRelease().then((res) => res.data);
        form = release.form;
        clonedChart = release;
        if (release.git_action_config) {
          this.context.setCurrentError(
            "Application/Jobs deployed with GitHub are not supported for cloning yet!"
          );
          this.props.history.push("/dashboard");
          return;
        }
        // If its not web worker or job it means is an addon, and for now it's not supported
        if (
          !["web", "worker", "job"].includes(release?.chart?.metadata?.name)
        ) {
          this.context.setCurrentError("Addons don't support cloning yet!");
          this.props.history.push("/dashboard");
          return;
        }
      }

      this.setState(
        {
          applicationTemplates: sortedVersionData,
          error: false,
          currentTemplate,
          isOnLaunchFlow,
          form,
          clonedChart,
        },
        () => {
          let preferredOrder = ["web", "worker", "job"];
          this.state.applicationTemplates.sort((a, b) => {
            return (
              preferredOrder.indexOf(a.name) - preferredOrder.indexOf(b.name)
            );
          });
          this.setState({
            loading: false,
          });
        }
      );
    } catch (error) {
      this.setState({ loading: false, error: true });
    }

    try {
      const res = await api.getHelmRepos(
        "<token>",
        {},
        {
          project_id: this.context.currentProject.id,
        }
      );

      let tabOptions = this.state.tabOptions.concat(
        ...res.data.map((val: any) => {
          return {
            value: `${val.id}`,
            label: capitalize(val.name),
          };
        })
      );

      this.setState({ tabOptions });
    } catch (error) {
      this.setState({ loading: false, error: true });
    }
  };

  isTryingToClone = () => {
    const queryParams = getQueryParams(this.props);
    return queryParams.has("shouldClone");
  };

  areCloneQueryParamsValid = () => {
    const qp = getQueryParams(this.props);

    const requiredParams = [
      "release_namespace",
      "release_template_version",
      "release_name",
      "release_version",
      "release_type",
    ];
    // Check if we have all the params we need to make the request for the cloned app
    // If the any param is missing then the some function will return true, so the validation
    // went wrong.
    return !requiredParams.some((rp) => !qp.has(rp));
  };

  getClonedRelease = () => {
    const queryParams = getQueryParams(this.props);

    if (!this.areCloneQueryParamsValid()) {
      this.context.setCurrentError(
        "Url has missing params to clone the app. Please try again."
      );
      this.props.history.push("/dashboard");
      return;
    }

    return api.getChart<ChartTypeWithExtendedConfig>(
      "<token>",
      {},
      {
        id: this.context.currentProject.id,
        name: queryParams.get("release_name"),
        revision: 0,
        namespace: queryParams.get("release_namespace"),
        cluster_id: this.context?.currentCluster?.id,
      }
    );
  };

  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer>
        <i className="material-icons">layers</i>
      </Polymer>
    );
  };

  renderTemplateList = (templates?: any, helm_repo_id?: number) => {
    if (!helm_repo_id && templates) {
      if (this.state.loading) {
        return (
          <LoadingWrapper>
            <Loading />
          </LoadingWrapper>
        );
      } else if (this.state.error) {
        return (
          <Placeholder>
            <i className="material-icons">error</i> Error retrieving templates.
          </Placeholder>
        );
      } else if (templates.length === 0) {
        return (
          <Placeholder>
            <i className="material-icons">category</i> No templates found.
          </Placeholder>
        );
      }
    }

    return (
      <TemplateList
        helm_repo_id={helm_repo_id}
        templates={templates}
        setCurrentTemplate={(template) =>
          this.setState({ currentTemplate: template })
        }
      />
    );
  };

  renderTabContents = () => {
    if (this.state.currentTemplate) {
      return (
        <ExpandedTemplate
          setForm={(x: any) => this.setState({ form: x })}
          showLaunchFlow={() => this.setState({ isOnLaunchFlow: true })}
          currentTab={this.state.currentTab}
          currentTemplate={this.state.currentTemplate}
          setCurrentTemplate={(currentTemplate: PorterTemplate) => {
            this.setState({ currentTemplate });
          }}
          helm_repo_id={parseInt(this.state.currentTab)}
        />
      );
    }
    if (this.state.currentTab === "porter") {
      return this.renderTemplateList(this.state.applicationTemplates);
    } else if (this.state.currentTab == "community") {
      return this.renderTemplateList(this.state.addonTemplates);
    } else {
      return this.renderTemplateList(null, parseInt(this.state.currentTab));
    }
  };

  renderContents = () => {
    if (this.state.readyClusterStatus === "checking") {
      return <Loading height="300px" />;
    } else if (this.state.readyClusterStatus === "none-ready") {
      return (
        <>
          <ClusterProvisioningPlaceholder />
        </>
      )
    } else if (this.context.currentCluster) {
      return (
        <>
          <TabSelector
            options={this.state.tabOptions}
            currentTab={this.state.currentTab}
            setCurrentTab={(value: string) =>
              this.setState({
                currentTab: value,
                currentTemplate: null,
              })
            }
          />
          {this.renderTabContents()}
        </>
      );
    } else if (this.context.currentCluster?.id === -1) {
      return <Loading height="300px" />;
    } else if (!this.context.currentCluster) {
      return (
        <>
          <Fieldset>
            <Text size={16}>No cluster detected</Text>
            <Spacer height="15px" />
            <Container row>
              <Text color="helper">A cluster is required to deploy applications. You can automatically provision a cluster</Text>
              <Link onClick={() => {
                pushFiltered(this.props, "/dashboard", ["project_id"]);
              }}>
                here
                <i className="material-icons">arrow_forward</i> 
              </Link>
            </Container>
            <Spacer height="10px" />
          </Fieldset>
        </>
      );
    }
  };

  render() {
    if (this.isTryingToClone() && this.state.loading) {
      return <Loading />;
    }
    if (!this.state.isOnLaunchFlow || !this.state.currentTemplate) {
      return (
        <TemplatesWrapper>
          <DashboardHeader
            title="Launch a new service"
            description="Deploy applications and add-ons to your environment."
            disableLineBreak
            capitalize={false}
          />
          {this.renderContents()}
        </TemplatesWrapper>
      );
    } else {
      return (
        <LaunchFlow
          isCloning={this.isTryingToClone()}
          clonedChart={this.state.clonedChart}
          form={this.state.form}
          currentTab={this.state.currentTab}
          currentTemplate={this.state.currentTemplate}
          hideLaunchFlow={() => this.setState({ isOnLaunchFlow: false })}
        />
      );
    }
  }
}

Templates.contextType = Context;

export default withRouter(Templates);

const Link = styled.a`
  text-decoration: underline;
  margin-left: 5px;
  position: relative;
  cursor: pointer;
  > i {
    color: #aaaabb;
    font-size: 15px;
    position: absolute;
    right: -17px;
    top: 1px;
  }
`;

const Placeholder = styled.div`
  padding-top: 200px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding-top: 300px;
`;

const Icon = styled.img`
  height: 42px;
  margin-top: 35px;
  margin-bottom: 13px;
`;

const Polymer = styled.div`
  > i {
    font-size: 34px;
    margin-top: 38px;
    margin-bottom: 20px;
  }
`;

const TemplatesWrapper = styled.div`
  width: 100%;
  overflow: visible;
  min-width: 300px;
`;
