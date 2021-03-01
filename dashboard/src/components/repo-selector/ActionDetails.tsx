import ImageSelector from "components/image-selector/ImageSelector";
import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "../../shared/Context";
import { ActionConfigType } from "../../shared/types";
import InputRow from "../values-form/InputRow";

type PropsType = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
};

type StateType = {
  dockerRepo: string;
  error: boolean;
};

export default class ActionDetails extends Component<PropsType, StateType> {
  state = {
    dockerRepo: "",
    error: false,
  };

  componentDidMount() {
    if (this.props.actionConfig.dockerfile_path) {
      this.setPath("/Dockerfile");
    } else {
      this.setPath("Dockerfile");
    }
  }

  setPath = (x: string) => {
    let { actionConfig, setActionConfig } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.dockerfile_path = updatedConfig.dockerfile_path.concat(x);
    setActionConfig(updatedConfig);
  };

  setURL = (x: string) => {
    let { actionConfig, setActionConfig } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.image_repo_uri = x;
    setActionConfig(updatedConfig);
  };

  renderConfirmation = () => {
    return (
      <Holder>
        <InputRow
          disabled={true}
          label="Git Repository"
          type="text"
          width="100%"
          value={this.props.actionConfig.git_repo}
          setValue={(x: string) => console.log(x)}
        />
        <InputRow
          disabled={true}
          label="Dockerfile Path"
          type="text"
          width="100%"
          value={this.props.actionConfig.dockerfile_path}
          setValue={(x: string) => console.log(x)}
        />
        <Label>Target Image URL</Label>
        <ImageSelector
          selectedTag="latest"
          selectedImageUrl={this.props.actionConfig.image_repo_uri}
          setSelectedImageUrl={this.setURL}
          setSelectedTag={() => null}
          forceExpanded={true}
          noTagSelection={true}
        />
      </Holder>
    );
  };

  render() {
    return <div>{this.renderConfirmation()}</div>;
  }
}

const Label = styled.div`
  color: #ffffff;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

ActionDetails.contextType = Context;

const Holder = styled.div`
  padding: 0px 12px 24px 12px;
`;
