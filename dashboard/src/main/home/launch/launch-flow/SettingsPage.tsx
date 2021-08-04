import React, { Component } from "react";
import styled from "styled-components";
import api from "shared/api";

import { Context } from "shared/Context";

import {
  ActionConfigType,
  ChoiceType,
  ClusterType,
  StorageType,
} from "shared/types";

import { isAlphanumeric } from "shared/common";

import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import Helper from "components/form-components/Helper";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import Selector from "components/Selector";
import Loading from "components/Loading";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

type PropsType = WithAuthProps & {
  onSubmit: (x?: any) => void;
  hasSource: boolean;
  setPage: (x: string) => void;
  form: any;
  valuesToOverride: any;
  clearValuesToOverride: () => void;

  templateName: string;
  setTemplateName: (x: string) => void;
  selectedNamespace: string;
  setSelectedNamespace: (x: string) => void;
  saveValuesStatus: string;
};

type StateType = {
  tabOptions: ChoiceType[];
  currentTab: string;
  clusterOptions: { label: string; value: string }[];
  selectedCluster: string;
  clusterMap: { [clusterId: string]: ClusterType };
  namespaceOptions: { label: string; value: string }[];
};

class SettingsPage extends Component<PropsType, StateType> {
  state = {
    tabOptions: [] as ChoiceType[],
    currentTab: "",
    clusterOptions: [] as { label: string; value: string }[],
    selectedCluster: this.context.currentCluster.name,
    clusterMap: {} as { [clusterId: string]: ClusterType },
    namespaceOptions: [] as { label: string; value: string }[],
  };

  componentDidMount() {
    window.scrollBy(0, -window.innerHeight);

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
          const availableNamespaces = res.data.items.filter(
            (namespace: any) => {
              return namespace.status.phase !== "Terminating";
            }
          );
          const namespaceOptions = availableNamespaces.map(
            (x: { metadata: { name: string } }) => {
              return { label: x.metadata.name, value: x.metadata.name };
            }
          );
          if (availableNamespaces.length > 0) {
            this.setState({ namespaceOptions });
          }
        }
      })
      .catch(console.log);
  };

  renderSettingsRegion = () => {
    let { saveValuesStatus, selectedNamespace, onSubmit } = this.props;

    if (this.state.currentTab === "") {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    }
    if (this.state.tabOptions.length > 0) {
      let {
        form,
        valuesToOverride,
        clearValuesToOverride,
        onSubmit,
      } = this.props;
      return (
        <FadeWrapper>
          <Heading>Additional Settings</Heading>
          <Helper>
            Configure additional settings for this template. (Optional)
          </Helper>
          <PorterFormWrapper
            formData={form}
            saveValuesStatus={saveValuesStatus}
            valuesToOverride={{
              ...valuesToOverride,
              namespace: selectedNamespace,
              clusterId: this.context.currentCluster.id,
            }}
            //externalValues={{
            //  isLaunch: true,
            //}}
            isReadOnly={
              !this.props.isAuthorized("namespace", "", ["get", "create"])
            }
            onSubmit={(val) => {
              onSubmit(val);
            }}
          />
        </FadeWrapper>
      );
    } else {
      return (
        <Wrapper>
          <Placeholder>
            To configure this chart through Porter,
            <Link
              target="_blank"
              href="https://github.com/porter-dev/porter-charts/blob/master/docs/form-yaml-reference.md"
            >
              refer to our docs
            </Link>
            .
          </Placeholder>
          <SaveButton
            text="Deploy"
            onClick={onSubmit}
            status={saveValuesStatus}
            makeFlush={true}
          />
        </Wrapper>
      );
    }
  };

  renderHeaderSection = () => {
    let { hasSource, templateName, setTemplateName } = this.props;

    if (hasSource) {
      return (
        <BackButton
          width="155px"
          onClick={() => {
            this.props.setPage("source");
          }}
        >
          <i className="material-icons">first_page</i>
          Source Settings
        </BackButton>
      );
    }

    return (
      <>
        <Heading>Name</Heading>
        <Helper>
          Randomly generated if left blank
          <Warning
            highlight={!isAlphanumeric(templateName) && templateName !== ""}
          >
            (lowercase letters, numbers, and "-" only)
          </Warning>
        </Helper>
        <InputWrapper>
          <InputRow
            type="string"
            value={templateName}
            setValue={setTemplateName}
            placeholder="ex: perspective-vortex"
            width="470px"
          />
        </InputWrapper>
      </>
    );
  };

  render() {
    let { selectedCluster } = this.state;

    let { selectedNamespace, setSelectedNamespace } = this.props;

    return (
      <PaddingWrapper>
        <StyledSettingsPage>
          {this.renderHeaderSection()}
          <Heading>Destination</Heading>
          <Helper>
            Specify the cluster and namespace you would like to deploy your
            application to.
          </Helper>
          <ClusterSection>
            <ClusterLabel>
              <i className="material-icons">device_hub</i>Cluster
            </ClusterLabel>
            <Selector
              activeValue={selectedCluster}
              setActiveValue={(cluster: string) => {
                this.context.setCurrentCluster(this.state.clusterMap[cluster]);
                this.updateNamespaces(this.state.clusterMap[cluster].id);
                this.setState({
                  selectedCluster: cluster,
                });
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
              refreshOptions={() => {
                this.updateNamespaces(this.context.currentCluster.id);
              }}
              addButton={this.props.isAuthorized("namespace", "", [
                "get",
                "create",
              ])}
              activeValue={selectedNamespace}
              setActiveValue={setSelectedNamespace}
              options={this.state.namespaceOptions}
              width="250px"
              dropdownWidth="335px"
              closeOverlay={true}
            />
          </ClusterSection>
          {this.renderSettingsRegion()}
        </StyledSettingsPage>
      </PaddingWrapper>
    );
  }
}

SettingsPage.contextType = Context;

export default withAuth(SettingsPage);

const LoadingWrapper = styled.div`
  margin-top: 80px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: -15px;
  margin-bottom: -6px;
`;

const Warning = styled.span`
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
  margin-left: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.makeFlush ? "" : "5px"};
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  margin-top: 25px;
  height: 35px;
  padding: 5px 13px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
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

const Link = styled.a`
  margin-left: 5px;
`;

const FadeWrapper = styled.div`
  animation: fadeIn 0.25s 0s;
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

const Heading = styled.div<{ isAtTop?: boolean }>`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 5px;
  margin-top: ${(props) => (props.isAtTop ? "10px" : "30px")};
  display: flex;
  align-items: center;
`;

const PaddingWrapper = styled.div`
  padding-bottom: 40px;
`;

const StyledSettingsPage = styled.div`
  position: relative;
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
