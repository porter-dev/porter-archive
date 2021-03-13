import React, { Component } from "react";
import styled from "styled-components";
import api from "shared/api";
import yaml from "js-yaml";

import {
  ChartType,
  RepoType,
  StorageType,
  ActionConfigType,
} from "shared/types";
import { Context } from "shared/Context";

import ImageSelector from "components/image-selector/ImageSelector";
import SaveButton from "components/SaveButton";
import Heading from "components/values-form/Heading";
import Helper from "components/values-form/Helper";
import InputRow from "components/values-form/InputRow";
import _ from "lodash";

type PropsType = {
  currentChart: ChartType;
  refreshChart: () => void;
  setShowDeleteOverlay: (x: boolean) => void;
};

type StateType = {
  sourceType: string;
  selectedImageUrl: string | null;
  selectedTag: string | null;
  saveValuesStatus: string | null;
  values: string;
  webhookToken: string;
  highlightCopyButton: boolean;
  action: ActionConfigType;
};

export default class SettingsSection extends Component<PropsType, StateType> {
  state = {
    sourceType: "",
    selectedImageUrl: "",
    selectedTag: "",
    values: "",
    saveValuesStatus: null as string | null,
    webhookToken: "",
    highlightCopyButton: false,
    action: {
      git_repo: "",
      image_repo_uri: "",
      git_repo_id: 0,
    } as ActionConfigType,
  };

  // TODO: read in set image from form context instead of config
  componentDidMount() {
    let { currentCluster, currentProject } = this.context;

    let image = this.props.currentChart.config?.image;
    this.setState({
      selectedImageUrl: image?.repository,
      selectedTag: image?.tag,
    });

    api
      .getReleaseToken(
        "<token>",
        {
          namespace: this.props.currentChart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        { id: currentProject.id, name: this.props.currentChart.name }
      )
      .then((res) => {
        console.log(res.data);
        this.setState({
          action: res.data.git_action_config,
          webhookToken: res.data.webhook_token,
        });
      })
      .catch(console.log);
  }

  redeployWithNewImage = (img: string, tag: string) => {
    this.setState({ saveValuesStatus: "loading" });
    let { currentCluster, currentProject } = this.context;

    // If tag is explicitly declared, parse tag
    let imgSplits = img.split(":");
    let parsedTag = null;
    if (imgSplits.length > 1) {
      img = imgSplits[0];
      parsedTag = imgSplits[1];
    }

    let image = {
      image: {
        repository: img,
        tag: parsedTag || tag,
      },
    };

    let values = {};
    let rawValues = this.props.currentChart.config;
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    // Weave in preexisting values and convert to yaml
    let valuesYaml = yaml.dump({
      ...values,
      ...image,
    });

    api
      .upgradeChartValues(
        "<token>",
        {
          namespace: this.props.currentChart.namespace,
          storage: StorageType.Secret,
          values: valuesYaml,
        },
        {
          id: currentProject.id,
          name: this.props.currentChart.name,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({ saveValuesStatus: "successful" });
        this.props.refreshChart();
      })
      .catch((err) => {
        console.log(err);
        this.setState({ saveValuesStatus: "error" });
      });
  };

  renderWebhookSection = () => {
    if (!this.props.currentChart?.form?.hasSource) {
      return;
    }

    if (true || this.state.webhookToken) {
      let webhookText = `curl -X POST 'https://dashboard.getporter.dev/api/webhooks/deploy/${this.state.webhookToken}?commit=YOUR_COMMIT_HASH&repository=IMAGE_REPOSITORY_URL'`;
      return (
        <>
          <Heading>Redeploy Webhook</Heading>
          <Helper>
            Programmatically deploy by calling this secret webhook.
          </Helper>
          <Webhook copiedToClipboard={this.state.highlightCopyButton}>
            <div>{webhookText}</div>
            <i
              className="material-icons"
              onClick={() => {
                navigator.clipboard.writeText(webhookText);
                this.setState({ highlightCopyButton: true });
              }}
              onMouseLeave={() => this.setState({ highlightCopyButton: false })}
            >
              content_copy
            </i>
          </Webhook>
        </>
      );
    }
  };

  render() {
    return (
      <Wrapper>
        <StyledSettingsSection>
          {this.renderWebhookSection()}
          <Heading>Additional Settings</Heading>
          <Button
            color="#b91133"
            onClick={() => this.props.setShowDeleteOverlay(true)}
          >
            Delete {this.props.currentChart.name}
          </Button>
        </StyledSettingsSection>
        <SaveButton
          text="Save Settings"
          onClick={() =>
            this.redeployWithNewImage(
              this.state.selectedImageUrl,
              this.state.selectedTag
            )
          }
          status={this.state.saveValuesStatus}
          makeFlush={true}
          disabled={
            this.state.selectedImageUrl && this.state.selectedTag ? false : true
          }
        />
      </Wrapper>
    );
  }
}

SettingsSection.contextType = Context;

const Button = styled.button`
  height: 35px;
  font-size: 13px;
  margin-top: 20px;
  margin-bottom: 30px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  box-shadow: ${(props) =>
    !props.disabled ? "0 2px 5px 0 #00000030" : "none"};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;

const Webhook = styled.div`
  width: 100%;
  border: 1px solid #ffffff55;
  background: #ffffff11;
  border-radius: 3px;
  display: flex;
  align-items: center;
  font-size: 13px;
  padding-left: 10px;
  color: #aaaabb;
  height: 40px;
  position: relative;
  margin-bottom: 40px;

  > div {
    user-select: all;
  }

  > i {
    padding: 5px;
    background: ${(props: { copiedToClipboard: boolean }) =>
      props.copiedToClipboard ? "#616FEEcc" : "#ffffff22"};
    border-radius: 5px;
    position: absolute;
    right: 10px;
    font-size: 14px;
    cursor: pointer;
    color: #ffffff;

    :hover {
      background: ${(props: { copiedToClipboard: boolean }) =>
        props.copiedToClipboard ? "" : "#ffffff44"};
    }
  }
`;

const Highlight = styled.div`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
  padding-right: ${(props: { padRight?: boolean }) =>
    props.padRight ? "5px" : ""};
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
  padding-right: ${(props: { padRight?: boolean }) =>
    props.padRight ? "5px" : ""};
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const StyledSettingsSection = styled.div`
  width: 100%;
  height: calc(100% - 60px);
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 50px;
  position: relative;
  border-radius: 5px;
  overflow: auto;
`;

const Holder = styled.div`
  padding: 0px 12px;
`;
