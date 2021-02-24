import React, { Component } from "react";
import styled from "styled-components";
import randomWords from "random-words";
import posthog from "posthog-js";
import _ from "lodash";
import { Context } from "shared/Context";
import api from "shared/api";

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
import { isAlphanumeric } from "shared/common";

type PropsType = {
  currentTemplate: any;
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
  pathIsSet: boolean;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_repo_id: 0,
  dockerfile_path: "",
};

export default class LaunchTemplate extends Component<PropsType, StateType> {
  state = {
    currentView: "repo",
    clusterOptions: [] as { label: string; value: string }[],
    clusterMap: {} as { [clusterId: string]: ClusterType },
    saveValuesStatus: "No container image specified" as string | null,
    selectedCluster: this.context.currentCluster.name,
    selectedNamespace: "default",
    selectedImageUrl: "" as string | null,
    sourceType: "registry",
    templateName: "",
    selectedTag: "" as string | null,
    tabOptions: [] as ChoiceType[],
    currentTab: null as string | null,
    tabContents: [] as any,
    namespaceOptions: [] as { label: string; value: string }[],
    actionConfig: { ...defaultActionConfig },
    branch: "",
    pathIsSet: false,
  };

  createGHAction = (chartName: string, chartNamespace: string) => {
    let { currentProject, currentCluster } = this.context;
    let { actionConfig } = this.state;

    api
      .createGHAction(
        "<token>",
        {
          git_repo: actionConfig.git_repo,
          image_repo_uri: actionConfig.image_repo_uri,
          dockerfile_path: actionConfig.dockerfile_path,
          git_repo_id: actionConfig.git_repo_id,
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
    let { currentCluster, currentProject } = this.context;
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
        console.log("ST");
        console.log(this.state.sourceType);
        if (this.state.sourceType === "repo") {
          this.createGHAction(name, this.state.selectedNamespace);
        }
        // this.props.setCurrentView('cluster-dashboard');
        this.setState({ saveValuesStatus: "successful" }, () => {
          // redirect to dashboard
        });
        posthog.capture("Deployed template", {
          name: this.props.currentTemplate.name,
          namespace: this.state.selectedNamespace,
          values: values,
        });
      })
      .catch((err) => {
        this.setState({ saveValuesStatus: "error" });
        posthog.capture("Failed to deploy template", {
          name: this.props.currentTemplate.name,
          namespace: this.state.selectedNamespace,
          values: values,
          error: err,
        });
      });
  };

  onSubmit = (rawValues: any) => {
    let { currentCluster, currentProject } = this.context;
    let name =
      this.state.templateName || randomWords({ exactly: 3, join: "-" });
    this.setState({ saveValuesStatus: "loading" });

    // Convert dotted keys to nested objects
    let values = {};
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
      imageUrl = "hello-world";
      tag = "latest";
    }

    _.set(values, "image.repository", imageUrl);
    _.set(values, "image.tag", tag);

    console.log(`
      ${this.props.currentTemplate.name}\n
      ${this.state.selectedImageUrl}\n
      ${values}\n
      ${this.state.selectedNamespace}\n
      ${name}\n
      ${currentProject.id}\n
      ${currentCluster.id}\n}
    `);

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
        }
      )
      .then((_) => {
        if (this.state.sourceType === "repo") {
          this.createGHAction(name, this.state.selectedNamespace);
        }
        // this.props.setCurrentView('cluster-dashboard');
        this.setState({ saveValuesStatus: "successful" }, () => {
          // redirect to dashboard with namespace
        });
        try {
          posthog.capture("Deployed template", {
            name: this.props.currentTemplate.name,
            namespace: this.state.selectedNamespace,
            values: values,
          });
        } catch (error) {
          console.log(error);
        }
      })
      .catch((err) => {
        this.setState({ saveValuesStatus: "error" });

        try {
          posthog.capture("Failed to deploy template", {
            name: this.props.currentTemplate.name,
            namespace: this.state.selectedNamespace,
            values: values,
            error: err,
          });
        } catch (error) {
          console.log(error);
        }
      });
  };

  renderTabContents = () => {
    return (
      <ValuesWrapper
        formTabs={this.props.form?.tabs}
        onSubmit={
          this.props.currentTemplate.name === "docker"
            ? this.onSubmit
            : this.onSubmitAddon
        }
        saveValuesStatus={this.state.saveValuesStatus}
        disabled={
          (this.state.templateName.length > 0 &&
            !isAlphanumeric(this.state.templateName)) ||
          (this.props.form?.hasSource ? !this.state.selectedImageUrl : false)
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
    this.setState({ tabOptions, currentTab: tabOptions[0]["value"] });

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
    if (x === "") {
      this.setState({ saveValuesStatus: "No container image specified" });
    } else {
      this.setState({ saveValuesStatus: "" });
    }
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
    if (this.props.form?.hasSource) {
      if (this.state.sourceType === "registry") {
        return (
          <>
            <Subtitle>
              Select the container image you would like to connect to this
              template
              {/* <Highlight onClick={() => this.setState({ sourceType: "repo" })}>
                link a git repository
              </Highlight> */}
              .<Required>*</Required>
            </Subtitle>
            <DarkMatter />
            <ImageSelector
              selectedTag={this.state.selectedTag}
              selectedImageUrl={this.state.selectedImageUrl}
              setSelectedImageUrl={this.setSelectedImageUrl}
              setSelectedTag={(x: string) => this.setState({ selectedTag: x })}
              forceExpanded={true}
            />
            <br />
          </>
        );
      } else {
        return (
          <>
            <Subtitle>
              Select a repo to connect to, then a Dockerfile to build from.
              <Required>*</Required>
            </Subtitle>
            <ActionConfEditor
              actionConfig={this.state.actionConfig}
              branch={this.state.branch}
              pathIsSet={this.state.pathIsSet}
              setActionConfig={(actionConfig: ActionConfigType) =>
                this.setState({ actionConfig }, () => {
                  this.setSelectedImageUrl(
                    this.state.actionConfig.image_repo_uri
                  );
                })
              }
              setBranch={(branch: string) => this.setState({ branch })}
              setPath={(pathIsSet: boolean) => this.setState({ pathIsSet })}
              reset={() => {
                this.setState({
                  actionConfig: { ...defaultActionConfig },
                  branch: "",
                  pathIsSet: false,
                });
              }}
            />
            <br />
          </>
        );
      }
    }
  };

  renderSourceSelector = () => {
    return (
      <>
        <TabRegion
          options={[
            { label: "Registry", value: "registry" },
            { label: "Github", value: "repo" },
          ]}
          currentTab={this.state.sourceType}
          setCurrentTab={(x) => this.setState({ sourceType: x })}
        >
          <StyledSourceBox>
            {this.renderSourceSelectorContent()}
          </StyledSourceBox>
        </TabRegion>
      </>
    );
  };

  render() {
    let { name, icon } = this.props.currentTemplate;
    let { currentTemplate } = this.props;

    return (
      <StyledLaunchTemplate>
        <ClusterSection>
          {this.props.hideBackButton ? null : (
            <Flex>
              <i className="material-icons" onClick={this.props.hideLaunch}>
                keyboard_backspace
              </i>
            </Flex>
          )}
          <Template>
            {icon
              ? this.renderIcon(icon)
              : this.renderIcon(currentTemplate.icon)}
            {name}
          </Template>
          <i className="material-icons">arrow_right_alt</i>
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
        <Subtitle>
          Template name
          <Warning
            highlight={
              !isAlphanumeric(this.state.templateName) &&
              this.state.templateName !== ""
            }
          >
            (lowercase letters, numbers, and "-" only)
          </Warning>
          . (Optional)
        </Subtitle>
        <DarkMatter antiHeight="-27px" />
        <InputRow
          type="text"
          value={this.state.templateName}
          setValue={(x: string) => this.setState({ templateName: x })}
          placeholder="ex: doctor-scientist"
          width="100%"
        />
        {this.renderSourceSelector()}
        {this.renderSettingsRegion()}
      </StyledLaunchTemplate>
    );
  }
}

LaunchTemplate.contextType = Context;

const Warning = styled.span<{ highlight: boolean; makeFlush?: boolean }>`
  color: ${(props) => (props.highlight ? "#f5cb42" : "")};
  margin-left: ${(props) => (props.makeFlush ? "" : "5px")};
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
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
  padding: 11px 0px 20px;
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
  margin-right: 10px;
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
  font-weight: 500;
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

const StyledLaunchTemplate = styled.div`
  width: 100%;
  padding-bottom: 150px;
`;

const Highlight = styled.div`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
  padding-right: ${(props: { padRight?: boolean }) =>
    props.padRight ? "5px" : ""};
`;

const StyledSourceBox = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  color: #ffffff;
  padding: 10px 35px 25px;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
  overflow: auto;
  margin-bottom: 25px;
`;
