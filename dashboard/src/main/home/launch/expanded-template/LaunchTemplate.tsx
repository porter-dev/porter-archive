import React, { Component } from "react";
import styled from "styled-components";
import randomWords from "random-words";
import _ from "lodash";
import { Context } from "shared/Context";
import api from "shared/api";
import close from "assets/close.png";
import { RouteComponentProps, withRouter } from "react-router";

import {
  ActionConfigType,
  ChoiceType,
  ClusterType,
  StorageType,
} from "shared/types";
import Selector from "components/Selector";
import ImageSelector from "components/image-selector/ImageSelector";
import TabRegion from "components/TabRegion";
import InputRow from "components/values-form/InputRow";
import SaveButton from "components/SaveButton";
import ActionConfEditor from "components/repo-selector/ActionConfEditor";
import ValuesWrapper from "components/values-form/ValuesWrapper";
import ValuesForm from "components/values-form/ValuesForm";
import RadioSelector from "components/RadioSelector";
import { isAlphanumeric } from "shared/common";

type PropsType = RouteComponentProps & {
  currentTemplate: any;
  currentTab: string;
  hideLaunch: () => void;
  values: any;
  form: any;
  hideBackButton?: boolean;
};

type StateType = {
  currentView: string;
  clusterOptions: { label: string; value: string }[];
  clusterMap: { [clusterId: string]: ClusterType };
  saveValuesStatus: string | null;
  selectedNamespace: string;
  selectedCluster: string;
  selectedImageUrl: string | null;
  sourceType: string;
  selectedTag: string | null;
  templateName: string;
  tabOptions: ChoiceType[];
  currentTab: string | null;
  tabContents: any;
  namespaceOptions: { label: string; value: string }[];
  actionConfig: ActionConfigType;
  branch: string;
  repoType: string;
  dockerfilePath: string | null;
  folderPath: string | null;
  selectedRegistry: any | null;
  env: any;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_repo_id: 0,
};

class LaunchTemplate extends Component<PropsType, StateType> {
  state = {
    currentView: "repo",
    clusterOptions: [] as { label: string; value: string }[],
    clusterMap: {} as { [clusterId: string]: ClusterType },
    saveValuesStatus: "" as string | null,
    selectedCluster: this.context.currentCluster.name,
    selectedNamespace: "default",
    selectedImageUrl: "" as string | null,
    sourceType: "",
    templateName: "",
    selectedTag: "" as string | null,
    tabOptions: [] as ChoiceType[],
    currentTab: null as string | null,
    tabContents: [] as any,
    namespaceOptions: [] as { label: string; value: string }[],
    actionConfig: { ...defaultActionConfig },
    branch: "",
    repoType: "",
    dockerfilePath: null as string | null,
    folderPath: null as string | null,
    selectedRegistry: null as any | null,
    env: {},
  };

  createGHAction = (chartName: string, chartNamespace: string) => {
    let { currentProject, currentCluster } = this.context;
    let { actionConfig } = this.state;
    let imageRepoUri = `${this.state.selectedRegistry.url}/${chartName}-${chartNamespace}`;

    // DockerHub registry integration is per repo
    if (this.state.selectedRegistry.service === "dockerhub") {
      imageRepoUri = this.state.selectedRegistry.url;
    }

    api
      .createGHAction(
        "<token>",
        {
          git_repo: actionConfig.git_repo,
          registry_id: this.state.selectedRegistry.id,
          dockerfile_path: this.state.dockerfilePath,
          folder_path: this.state.folderPath,
          image_repo_uri: imageRepoUri,
          git_repo_id: actionConfig.git_repo_id,
          env: this.state.env,
        },
        {
          project_id: currentProject.id,
          CLUSTER_ID: currentCluster.id,
          RELEASE_NAME: chartName,
          RELEASE_NAMESPACE: chartNamespace,
        }
      )
      .then((res) => console.log(res.data))
      .catch(console.log);
  };

  onSubmitAddon = (wildcard?: any) => {
    let { currentCluster, currentProject, setCurrentError } = this.context;
    let name =
      this.state.templateName || randomWords({ exactly: 3, join: "-" });
    this.setState({ saveValuesStatus: "loading" });

    let values = {};
    for (let key in wildcard) {
      _.set(values, key, wildcard[key]);
    }

    api
      .deployTemplate(
        "<token>",
        {
          templateName: this.props.currentTemplate.name,
          storage: StorageType.Secret,
          formValues: values,
          namespace: this.state.selectedNamespace,
          name,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          name: this.props.currentTemplate.name.toLowerCase().trim(),
          version: "latest",
        }
      )
      .then((_) => {
        // this.props.setCurrentView('cluster-dashboard');
        this.setState({ saveValuesStatus: "successful" }, () => {
          // redirect to dashboard
          setTimeout(() => {
            this.props.history.push("cluster-dashboard");
          }, 500);
          window.analytics.track("Deployed Add-on", {
            name: this.props.currentTemplate.name,
            namespace: this.state.selectedNamespace,
            values: values,
          });
        });
      })
      .catch((err) => {
        this.setState({ saveValuesStatus: "error" });
        setCurrentError(err.response.data.errors[0]);
        window.analytics.track("Failed to Deploy Add-on", {
          name: this.props.currentTemplate.name,
          namespace: this.state.selectedNamespace,
          values: values,
          error: err,
        });
      });
  };

  onSubmit = async (rawValues: any) => {
    let { currentCluster, currentProject } = this.context;
    let name =
      this.state.templateName || randomWords({ exactly: 3, join: "-" });
    this.setState({ saveValuesStatus: "loading" });

    // Convert dotted keys to nested objects
    let values: any = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    let imageUrl = this.state.selectedImageUrl;
    let tag = this.state.selectedTag;

    if (this.state.selectedImageUrl.includes(":")) {
      let splits = this.state.selectedImageUrl.split(":");
      imageUrl = splits[0];
      tag = splits[1];
    } else if (!tag) {
      tag = "latest";
    }

    if (this.state.sourceType === "repo") {
      imageUrl = "porterdev/hello-porter";
      tag = "latest";
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
    var url: string;

    // check if template is docker and create external domain if necessary
    if (this.props.currentTemplate.name == "web") {
      if (values?.ingress?.enabled && values?.ingress?.hosts?.length == 0) {
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
              resolve(res.data?.external_url);
            })
            .catch((err) => {
              this.setState({ saveValuesStatus: "error" });
            });
        });

        values.ingress.hosts = [url];
        values.ingress.custom_domain = true;
      }
    }

    console.log("VALUES ARE", values);

    api
      .deployTemplate(
        "<token>",
        {
          templateName: this.props.currentTemplate.name,
          imageURL: this.state.selectedImageUrl,
          storage: StorageType.Secret,
          formValues: values,
          namespace: this.state.selectedNamespace,
          name,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          name: this.props.currentTemplate.name.toLowerCase().trim(),
          version: "latest",
          repo_url: process.env.APPLICATION_CHART_REPO_URL,
        }
      )
      .then((_) => {
        console.log("Deployed template.");
        if (this.state.sourceType === "repo") {
          console.log("Creating GHA");
          this.createGHAction(name, this.state.selectedNamespace);
        }
        // this.props.setCurrentView('cluster-dashboard');
        this.setState({ saveValuesStatus: "successful" }, () => {
          // redirect to dashboard with namespace
          setTimeout(() => {
            this.props.history.push("cluster-dashboard");
          }, 1000);
        });
        /*
        try {
          window.analytics.track("Deployed Application", {
            name: this.props.currentTemplate.name,
            namespace: this.state.selectedNamespace,
            sourceType: this.state.sourceType,
            values: values,
          });
        } catch (error) {
          console.log(error);
        }
        */
      })
      .catch((err) => {
        this.setState({ saveValuesStatus: "error" });
        /*
        try {
          window.analytics.track("Failed to Deploy Application", {
            name: this.props.currentTemplate.name,
            namespace: this.state.selectedNamespace,
            sourceType: this.state.sourceType,
            values: values,
            error: err,
          });
        } catch (error) {
          console.log(error);
        }
        */
      });
  };

  submitIsDisabled = () => {
    let {
      templateName,
      sourceType,
      selectedImageUrl,
      dockerfilePath,
      folderPath,
    } = this.state;

    // Allow if name is invalid
    if (templateName.length > 0 && !isAlphanumeric(templateName)) {
      return true;
    }

    if (this.props.form?.hasSource) {
      // Allow if source type is registry and image URL is specified
      if (sourceType === "registry" && selectedImageUrl) {
        return false;
      }

      // Allow if source type is repo and dockerfile or folder path is set
      if (sourceType === "repo" && (dockerfilePath || folderPath)) {
        return !this.state.selectedRegistry;
      }

      return true;
    } else {
      return false;
    }
  };

  getStatus = () => {
    let {
      selectedRegistry,
      sourceType,
      dockerfilePath,
      folderPath,
    } = this.state;

    if (this.submitIsDisabled()) {
      if (
        sourceType === "repo" &&
        (dockerfilePath || folderPath) &&
        !selectedRegistry
      ) {
        return "A connected container registry is required";
      }
      let { templateName } = this.state;
      if (templateName.length > 0 && !isAlphanumeric(templateName)) {
        return "Template name contains illegal characters";
      }
      return "No application source specified";
    } else {
      return this.state.saveValuesStatus;
    }
  };

  renderTabContents = () => {
    return (
      <ValuesWrapper
        formTabs={this.props.form?.tabs}
        onSubmit={
          this.props.currentTab === "docker"
            ? this.onSubmit
            : this.onSubmitAddon
        }
        saveValuesStatus={this.getStatus()}
        disabled={this.submitIsDisabled()}
      >
        {(metaState: any, setMetaState: any) => {
          return this.props.form?.tabs.map((tab: any, i: number) => {
            // If tab is current, render
            if (tab.name === this.state.currentTab) {
              return (
                <ValuesForm
                  metaState={metaState}
                  handleEnvChange={(x: any) => this.setState({ env: x })}
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
  };

  componentDidMount() {
    if (this.props.currentTemplate.name !== "docker") {
      this.setState({ saveValuesStatus: "" });
    }
    // Retrieve tab options
    let tabOptions = [] as ChoiceType[];
    this.props.form?.tabs.map((tab: any, i: number) => {
      if (tab.context.type === "helm/values") {
        tabOptions.push({ value: tab.name, label: tab.label });
      }
    });

    this.setState({
      tabOptions,
      currentTab: tabOptions[0] && tabOptions[0]["value"],
    });

    // TODO: query with selected filter once implemented
    let { currentProject, currentCluster } = this.context;
    api.getClusters("<token>", {}, { id: currentProject.id }).then((res) => {
      if (res.data) {
        let clusterOptions: { label: string; value: string }[] = [];
        let clusterMap: { [clusterId: string]: ClusterType } = {};
        res.data.forEach((cluster: ClusterType, i: number) => {
          clusterOptions.push({ label: cluster.name, value: cluster.name });
          clusterMap[cluster.name] = cluster;
        });
        if (res.data.length > 0) {
          this.setState({ clusterOptions, clusterMap });
        }
      }
    });

    this.updateNamespaces(currentCluster.id);
  }

  updateNamespaces = (id: number) => {
    let { currentProject } = this.context;
    api
      .getNamespaces(
        "<token>",
        {
          cluster_id: id,
        },
        { id: currentProject.id }
      )
      .then((res) => {
        if (res.data) {
          let namespaceOptions = res.data.items.map(
            (x: { metadata: { name: string } }) => {
              return { label: x.metadata.name, value: x.metadata.name };
            }
          );
          if (res.data.items.length > 0) {
            this.setState({ namespaceOptions });
          }
        }
      })
      .catch(console.log);
  };

  setSelectedImageUrl = (x: string) => {
    this.setState({ selectedImageUrl: x });
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

  renderSettingsRegion = () => {
    if (this.state.tabOptions.length > 0) {
      return (
        <>
          <Heading>Additional Settings</Heading>
          <Subtitle>
            Configure additional settings for this template. (Optional)
          </Subtitle>
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
              target="_blank"
              href="https://docs.getporter.dev/docs/porter-templates"
            >
              refer to our docs
            </Link>
            .
          </Placeholder>
          <SaveButton
            text="Deploy"
            onClick={this.onSubmitAddon}
            status={this.state.saveValuesStatus}
            makeFlush={true}
          />
        </Wrapper>
      );
    }
  };

  // Display if current template uses source (image or repo)
  renderSourceSelectorContent = () => {
    if (this.state.sourceType === "") {
      return (
        <BlockList>
          <Block
            onClick={() => {
              this.setState({ sourceType: "repo" });
            }}
          >
            <BlockIcon src="https://3.bp.blogspot.com/-xhNpNJJyQhk/XIe4GY78RQI/AAAAAAAAItc/ouueFUj2Hqo5dntmnKqEaBJR4KQ4Q2K3ACK4BGAYYCw/s1600/logo%2Bgit%2Bicon.png" />
            <BlockTitle>Git Repository</BlockTitle>
            <BlockDescription>
              Deploy using source from a Git repo.
            </BlockDescription>
          </Block>
          <Block
            onClick={() => {
              this.setState({ sourceType: "registry" });
            }}
          >
            <BlockIcon src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png" />
            <BlockTitle>Docker Registry</BlockTitle>
            <BlockDescription>
              Deploy a container from an image registry.
            </BlockDescription>
          </Block>
        </BlockList>
      );
    } else if (this.state.sourceType === "registry") {
      return (
        <StyledSourceBox>
          <CloseButton onClick={() => this.setState({ sourceType: "" })}>
            <CloseButtonImg src={close} />
          </CloseButton>
          <Subtitle>
            Specify the container image you would like to connect to this
            template.
            <Highlight
              onClick={() => this.props.history.push("integrations/registry")}
            >
              Manage Docker registries
            </Highlight>
            <Required>*</Required>
          </Subtitle>
          <DarkMatter antiHeight="-4px" />
          <ImageSelector
            selectedTag={this.state.selectedTag}
            selectedImageUrl={this.state.selectedImageUrl}
            setSelectedImageUrl={this.setSelectedImageUrl}
            setSelectedTag={(x: string) => this.setState({ selectedTag: x })}
            forceExpanded={true}
          />
          <br />
        </StyledSourceBox>
      );
    } else if (this.state.repoType === "" && false) {
      return (
        <StyledSourceBox>
          <CloseButton onClick={() => this.setState({ sourceType: "" })}>
            <CloseButtonImg src={close} />
          </CloseButton>
          <Subtitle>
            Are you using an existing Dockerfile from your repo?
            <Required>*</Required>
          </Subtitle>
          <RadioSelector
            options={[
              {
                value: "dockerfile",
                label: "Yes, I am using an existing Dockerfile",
              },
              {
                value: "buildpack",
                label: "No, I am not using an existing Dockerfile",
              },
            ]}
            selected={this.state.repoType}
            setSelected={(x: string) => this.setState({ repoType: x })}
          />
        </StyledSourceBox>
      );
    } else {
      return (
        <StyledSourceBox>
          <CloseButton onClick={() => this.setState({ sourceType: "" })}>
            <CloseButtonImg src={close} />
          </CloseButton>
          <Subtitle>
            Provide a repo folder to use as source.
            <Highlight
              onClick={() => this.props.history.push("integrations/repo")}
            >
              Manage Git repos
            </Highlight>
            <Required>*</Required>
          </Subtitle>
          <DarkMatter antiHeight="-4px" />
          <ActionConfEditor
            actionConfig={this.state.actionConfig}
            branch={this.state.branch}
            setActionConfig={(actionConfig: ActionConfigType) =>
              this.setState({ actionConfig }, () => {
                this.setSelectedImageUrl(
                  this.state.actionConfig.image_repo_uri
                );
              })
            }
            setBranch={(branch: string) => this.setState({ branch })}
            setDockerfilePath={(x: string) =>
              this.setState({ dockerfilePath: x })
            }
            dockerfilePath={this.state.dockerfilePath}
            folderPath={this.state.folderPath}
            setFolderPath={(x: string) => this.setState({ folderPath: x })}
            reset={() => {
              this.setState({
                actionConfig: { ...defaultActionConfig },
                branch: "",
                dockerfilePath: null,
                folderPath: null,
              });
            }}
            setSelectedRegistry={(x: any) => {
              this.setState({ selectedRegistry: x });
            }}
            selectedRegistry={this.state.selectedRegistry}
          />
          <br />
        </StyledSourceBox>
      );
    }
  };

  renderSourceSelector = () => {
    return (
      <>
        <Heading>Deployment Method</Heading>
        <Subtitle>
          Choose the deployment method you would like to use for this
          application.
          <Required>*</Required>
        </Subtitle>
        {this.renderSourceSelectorContent()}
      </>
    );
  };

  render() {
    let { name, icon } = this.props.currentTemplate;
    let { currentTemplate } = this.props;

    return (
      <StyledLaunchTemplate>
        <HeaderSection>
          <i className="material-icons" onClick={this.props.hideLaunch}>
            keyboard_backspace
          </i>
          {icon ? this.renderIcon(icon) : this.renderIcon(currentTemplate.icon)}
          <Title>{name}</Title>
        </HeaderSection>
        <DarkMatter antiHeight="-13px" />
        <Heading isAtTop={true}>Name</Heading>
        <Subtitle>
          Randomly generated if left blank.
          <Warning
            highlight={
              !isAlphanumeric(this.state.templateName) &&
              this.state.templateName !== ""
            }
          >
            Lowercase letters, numbers, and "-" only.
          </Warning>
        </Subtitle>
        <DarkMatter antiHeight="-29px" />
        <InputRow
          type="text"
          value={this.state.templateName}
          setValue={(x: string) => this.setState({ templateName: x })}
          placeholder="ex: doctor-scientist"
          width="100%"
        />

        {this.props.form?.hasSource && this.renderSourceSelector()}

        <Heading>Destination</Heading>
        <Subtitle>
          Specify the cluster and namespace you would like to deploy your
          application to.
        </Subtitle>
        <ClusterSection>
          <ClusterLabel>
            <i className="material-icons">device_hub</i>Cluster
          </ClusterLabel>
          <Selector
            activeValue={this.state.selectedCluster}
            setActiveValue={(cluster: string) => {
              this.context.setCurrentCluster(this.state.clusterMap[cluster]);
              this.updateNamespaces(this.state.clusterMap[cluster].id);
              console.log(this.state.clusterMap[cluster]);
              this.setState({ selectedCluster: cluster });
            }}
            options={this.state.clusterOptions}
            width="250px"
            dropdownWidth="335px"
            closeOverlay={true}
          />
          <NamespaceLabel>
            <i className="material-icons">view_list</i>Namespace
          </NamespaceLabel>
          <Selector
            key={"namespace"}
            activeValue={this.state.selectedNamespace}
            setActiveValue={(namespace: string) =>
              this.setState({ selectedNamespace: namespace })
            }
            options={this.state.namespaceOptions}
            width="250px"
            dropdownWidth="335px"
            closeOverlay={true}
          />
        </ClusterSection>
        {this.renderSettingsRegion()}
      </StyledLaunchTemplate>
    );
  }
}

LaunchTemplate.contextType = Context;
export default withRouter(LaunchTemplate);

const Bold = styled.div`
  font-weight: bold;
  color: white;
  margin-right: 5px;
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

const BlockIcon = styled.img<{ bw?: boolean }>`
  height: 38px;
  padding: 2px;
  margin-top: 30px;
  margin-bottom: 15px;
  filter: ${(props) => (props.bw ? "grayscale(1)" : "")};
`;

const BlockDescription = styled.div`
  margin-bottom: 12px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  font-size: 13px;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const BlockTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Block = styled.div<{ disabled?: boolean }>`
  align-items: center;
  user-select: none;
  border-radius: 5px;
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 12px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 170px;
  cursor: ${(props) => (props.disabled ? "" : "pointer")};
  color: #ffffff;
  position: relative;
  background: #26282f;
  box-shadow: 0 3px 5px 0px #00000022;
  :hover {
    background: ${(props) => (props.disabled ? "" : "#ffffff11")};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const BlockList = styled.div`
  overflow: visible;
  margin-top: 6px;
  margin-bottom: 27px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: "Work Sans", sans-serif;
  margin-left: 10px;
  border-radius: 2px;
  color: #ffffff;
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 30px;

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

const Heading = styled.div<{ isAtTop?: boolean }>`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 5px;
  margin-top: ${(props) => (props.isAtTop ? "10px" : "30px")};
  display: flex;
  align-items: center;
`;

const Warning = styled.span<{ highlight: boolean; makeFlush?: boolean }>`
  color: ${(props) => (props.highlight ? "#f5cb42" : "")};
  margin-left: ${(props) => (props.makeFlush ? "" : "5px")};
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Link = styled.a`
  margin-left: 5px;
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
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

const Subtitle = styled.div`
  padding: 11px 0px 16px;
  font-family: "Work Sans", sans-serif;
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
  margin-right: 6px;
  margin-left: 10px;
`;

const Polymer = styled.div`
  margin-bottom: -3px;

  > i {
    color: ${(props) => props.theme.containerIcon};
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
  font-family: "Work Sans", sans-serif;
  font-size: 14px;
  margin-top: 2px;
  font-weight: 500;
  margin-bottom: 32px;

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

const StyledLaunchTemplate = styled.div`
  width: 100%;
  padding-bottom: 150px;
`;

const Highlight = styled.div`
  color: #8590ff;
  text-decoration: none;
  margin-left: 5px;
  cursor: pointer;
`;

const StyledSourceBox = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  color: #ffffff;
  padding: 14px 35px 20px;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
  margin-top: 6px;
  overflow: auto;
  margin-bottom: 25px;
`;
