import React, { Component } from "react";
import styled from "styled-components";
import _ from "lodash";
import randomWords from "random-words";
import { RouteComponentProps, withRouter } from "react-router";

import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";

import { hardcodedNames } from "shared/hardcodedNameDict";
import SourcePage from "./SourcePage";
import SettingsPage from "./SettingsPage";

import {
  PorterTemplate,
  ActionConfigType,
  ChoiceType,
  ClusterType,
  StorageType,
} from "shared/types";

type PropsType = RouteComponentProps & {
  currentTab?: string;
  currentTemplate: PorterTemplate;
  hideLaunchFlow: () => void;
  form: any;
};

type StateType = {
  currentPage: string;
  templateName: string;
  sourceType: string;
  valuesToOverride: any;

  imageUrl: string;
  imageTag: string;

  actionConfig: ActionConfigType;
  procfileProcess?: string;
  branch: string;
  repoType: string;
  dockerfilePath: string | null;
  procfilePath: string | null;
  folderPath: string | null;
  selectedRegistry: any;

  selectedNamespace: string;
  saveValuesStatus: string;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  branch: "",
  git_repo_id: 0,
};

class LaunchFlow extends Component<PropsType, StateType> {
  state = {
    currentPage: "source",
    templateName: "",
    saveValuesStatus: "",
    sourceType: "",
    selectedNamespace: "default",
    valuesToOverride: {} as any,

    imageUrl: "",
    imageTag: "",

    actionConfig: { ...defaultActionConfig },
    procfileProcess: null as string | null,
    branch: "",
    repoType: "",
    dockerfilePath: null as string | null,
    procfilePath: null as string | null,
    folderPath: null as string | null,
    selectedRegistry: null as any,
  };

  createGHAction = (chartName: string, chartNamespace: string, env?: any) => {
    let { currentProject, currentCluster, setCurrentError } = this.context;
    let {
      actionConfig,
      branch,
      selectedRegistry,
      dockerfilePath,
      folderPath,
    } = this.state;
    let imageRepoUri = `${selectedRegistry.url}/${chartName}-${chartNamespace}`;

    // DockerHub registry integration is per repo
    if (selectedRegistry.service === "dockerhub") {
      imageRepoUri = selectedRegistry.url;
    }

    api
      .createGHAction(
        "<token>",
        {
          git_repo: actionConfig.git_repo,
          git_branch: branch,
          registry_id: selectedRegistry.id,
          dockerfile_path: dockerfilePath,
          folder_path: folderPath,
          image_repo_uri: imageRepoUri,
          git_repo_id: actionConfig.git_repo_id,
          env: env,
        },
        {
          project_id: currentProject.id,
          CLUSTER_ID: currentCluster.id,
          RELEASE_NAME: chartName,
          RELEASE_NAMESPACE: chartNamespace,
        }
      )
      .then((res) => console.log(""))
      .catch((err) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];
        err = parsedErr || err.message || JSON.stringify(err);

        this.setState({
          saveValuesStatus: `Could not create GitHub Action: ${err}`,
        });

        setCurrentError(err);
      });
  };

  onSubmitAddon = (wildcard?: any) => {
    let { selectedNamespace } = this.state;
    let { currentCluster, currentProject, setCurrentError } = this.context;
    let name =
      this.state.templateName || randomWords({ exactly: 3, join: "-" });
    this.setState({ saveValuesStatus: "loading" });

    let values = {};
    for (let key in wildcard) {
      _.set(values, key, wildcard[key]);
    }

    api
      .deployAddon(
        "<token>",
        {
          templateName: this.props.currentTemplate.name,
          storage: StorageType.Secret,
          formValues: values,
          namespace: selectedNamespace,
          name,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          name: this.props.currentTemplate.name.toLowerCase().trim(),
          version: this.props.currentTemplate?.currentVersion || "latest",
          repo_url: process.env.ADDON_CHART_REPO_URL,
        }
      )
      .then((_) => {
        // this.props.setCurrentView('cluster-dashboard');
        this.setState({ saveValuesStatus: "successful" }, () => {
          // redirect to dashboard
          let dst =
            this.props.currentTemplate.name === "job"
              ? "/jobs"
              : "/applications";
          setTimeout(() => {
            pushFiltered(this.props, dst, ["project_id"], {
              cluster: currentCluster.name,
            });
          }, 500);
          window.analytics.track("Deployed Add-on", {
            name: this.props.currentTemplate.name,
            namespace: selectedNamespace,
            values: values,
          });
        });
      })
      .catch((err) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];

        err = parsedErr || err.message || JSON.stringify(err);

        this.setState({
          saveValuesStatus: err,
        });

        setCurrentError(err);
        window.analytics.track("Failed to Deploy Add-on", {
          name: this.props.currentTemplate.name,
          namespace: selectedNamespace,
          values: values,
          error: err,
        });
      });
  };

  onSubmit = async (rawValues: any) => {
    let { currentCluster, currentProject, setCurrentError } = this.context;
    let {
      selectedNamespace,
      templateName,
      imageUrl,
      imageTag,
      sourceType,
    } = this.state;
    let name = templateName || randomWords({ exactly: 3, join: "-" });
    this.setState({ saveValuesStatus: "loading" });

    // Convert dotted keys to nested objects
    let values: any = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    let tag = imageTag;
    if (imageUrl.includes(":")) {
      let splits = imageUrl.split(":");
      imageUrl = splits[0];
      tag = splits[1];
    } else if (!tag) {
      tag = "latest";
    }

    if (sourceType === "repo") {
      if (this.props.currentTemplate?.name == "job") {
        imageUrl = "public.ecr.aws/o1j4x7p4/hello-porter-job";
        tag = "latest";
      } else {
        imageUrl = "public.ecr.aws/o1j4x7p4/hello-porter";
        tag = "latest";
      }
    }

    let provider;
    switch (currentCluster.service) {
      case "eks":
        provider = "aws";
        break;
      case "gke":
        provider = "gcp";
        break;
      case "doks":
        provider = "digitalocean";
        break;
      default:
        provider = "";
    }

    // don't overwrite for templates that already have a source (i.e. non-Docker templates)
    if (imageUrl && tag) {
      _.set(values, "image.repository", imageUrl);
      _.set(values, "image.tag", tag);
    }

    _.set(values, "ingress.provider", provider);

    // pause jobs automatically
    if (this.props.currentTemplate?.name == "job") {
      _.set(values, "paused", true);
    }

    var url: string;
    // check if template is docker and create external domain if necessary
    if (this.props.currentTemplate.name == "web") {
      if (values?.ingress?.enabled && !values?.ingress?.custom_domain) {
        url = await new Promise((resolve, reject) => {
          api
            .createSubdomain(
              "<token>",
              {
                release_name: name,
              },
              {
                id: currentProject.id,
                cluster_id: currentCluster.id,
              }
            )
            .then((res) => {
              resolve(res?.data?.external_url);
            })
            .catch((err) => {
              let parsedErr =
                err?.response?.data?.errors && err.response.data.errors[0];
              err = parsedErr || err.message || JSON.stringify(err);
              this.setState({
                saveValuesStatus: `Could not create subdomain: ${err}`,
              });

              setCurrentError(err);
            });
        });

        values.ingress.porter_hosts = [url];
      }
    }

    api
      .deployTemplate(
        "<token>",
        {
          templateName: this.props.currentTemplate.name,
          imageURL: imageUrl,
          storage: StorageType.Secret,
          formValues: values,
          namespace: selectedNamespace,
          name,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          name: this.props.currentTemplate.name.toLowerCase().trim(),
          version: this.props.currentTemplate?.currentVersion || "latest",
          repo_url: process.env.APPLICATION_CHART_REPO_URL,
        }
      )
      .then((res: any) => {
        if (sourceType === "repo") {
          let env = rawValues["container.env.normal"];
          this.createGHAction(name, selectedNamespace, env);
        }
        // this.props.setCurrentView('cluster-dashboard');
        this.setState({ saveValuesStatus: "successful" }, () => {
          // redirect to dashboard with namespace
          setTimeout(() => {
            let dst =
              this.props.currentTemplate.name === "job"
                ? "/jobs"
                : "/applications";
            pushFiltered(this.props, dst, ["project_id"], {
              cluster: currentCluster.name,
            });
          }, 1000);
        });
      })
      .catch((err: any) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];
        err = parsedErr || err.message || JSON.stringify(err);
        this.setState({
          saveValuesStatus: `Could not deploy template: ${err}`,
        });
        setCurrentError(err);
      });
  };

  renderCurrentPage = () => {
    let { form, currentTab } = this.props;
    let {
      currentPage,
      valuesToOverride,
      templateName,
      imageUrl,
      imageTag,
      actionConfig,
      branch,
      repoType,
      dockerfilePath,
      procfileProcess,
      procfilePath,
      folderPath,
      selectedNamespace,
      selectedRegistry,
      saveValuesStatus,
      sourceType,
    } = this.state;

    if (currentPage === "source" && currentTab === "porter") {
      return (
        <SourcePage
          sourceType={sourceType}
          setSourceType={(x: string) => this.setState({ sourceType: x })}
          templateName={templateName}
          setPage={(x: string) => {
            this.setState({ currentPage: x });
          }}
          setTemplateName={(x: string) => this.setState({ templateName: x })}
          setValuesToOverride={(x: any) =>
            this.setState({ valuesToOverride: x })
          }
          imageUrl={imageUrl}
          setImageUrl={(x: string) => this.setState({ imageUrl: x })}
          imageTag={imageTag}
          setImageTag={(x: string) => this.setState({ imageTag: x })}
          actionConfig={actionConfig}
          setActionConfig={(x: ActionConfigType) =>
            this.setState({ actionConfig: x })
          }
          branch={branch}
          setBranch={(x: string) => this.setState({ branch: x })}
          procfileProcess={procfileProcess}
          setProcfileProcess={(x: string) =>
            this.setState({ procfileProcess: x })
          }
          repoType={repoType}
          setRepoType={(x: string) => this.setState({ repoType: x })}
          dockerfilePath={dockerfilePath}
          setDockerfilePath={(x: string) =>
            this.setState({ dockerfilePath: x })
          }
          folderPath={folderPath}
          setFolderPath={(x: string) => this.setState({ folderPath: x })}
          procfilePath={procfilePath}
          setProcfilePath={(x: string) => this.setState({ procfilePath: x })}
          selectedRegistry={selectedRegistry}
          setSelectedRegistry={(x: string) =>
            this.setState({ selectedRegistry: x })
          }
        />
      );
    }

    // Display main (non-source) settings page
    return (
      <SettingsPage
        onSubmit={currentTab === "porter" ? this.onSubmit : this.onSubmitAddon}
        saveValuesStatus={saveValuesStatus}
        selectedNamespace={selectedNamespace}
        setSelectedNamespace={(x: string) =>
          this.setState({ selectedNamespace: x })
        }
        templateName={templateName}
        setTemplateName={(x: string) => this.setState({ templateName: x })}
        hasSource={currentTab === "porter"}
        setPage={(x: string) => this.setState({ currentPage: x })}
        form={form}
        valuesToOverride={valuesToOverride}
        clearValuesToOverride={() => this.setState({ valuesToOverride: null })}
      />
    );
  };

  renderIcon = () => {
    let icon = this.props.currentTemplate?.icon;
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer>
        <i className="material-icons">layers</i>
      </Polymer>
    );
  };

  render() {
    let { currentTab } = this.props;
    let { name } = this.props.currentTemplate;
    if (hardcodedNames[name]) {
      name = hardcodedNames[name];
    }

    return (
      <StyledLaunchFlow>
        <TitleSection>
          <i className="material-icons" onClick={this.props.hideLaunchFlow}>
            keyboard_backspace
          </i>
          {this.renderIcon()}
          <Title>
            New {name} {currentTab === "porter" ? null : "Instance"}
          </Title>
        </TitleSection>
        {this.renderCurrentPage()}
        <Br />
      </StyledLaunchFlow>
    );
  }
}

LaunchFlow.contextType = Context;
export default withRouter(LaunchFlow);

const Br = styled.div`
  width: 100%;
  height: 120px;
`;

const Icon = styled.img`
  width: 40px;
  margin-right: 14px;

  opacity: 0;
  animation: floatIn 0.5s 0.2s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Polymer = styled.div`
  margin-bottom: -3px;

  > i {
    color: ${(props) => props.theme.containerIcon};
    font-size: 24px;
    margin-left: 12px;
    margin-right: 3px;
  }
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    margin-right: 10px;
    padding: 3px;
    margin-left: 0px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 18px;
      margin-left: 18px;
      color: #858faaaa;
      cursor: pointer;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const StyledLaunchFlow = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  padding-top: 20px;
  margin-top: calc(50vh - 340px);
`;
