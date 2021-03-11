import ImageSelector from "components/image-selector/ImageSelector";
import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "../../shared/Context";
import { ActionConfigType } from "../../shared/types";
import InputRow from "../values-form/InputRow";

type PropsType = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
  branch: string;
  dockerfilePath: string;
  folderPath: string;
  setSelectedRegistryId: (x: number) => void;
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

  render() {
    return (
      <>
        <DarkMatter />
        <InputRow
          disabled={true}
          label="Git Repository"
          type="text"
          width="100%"
          value={this.props.actionConfig.git_repo}
        />
        {this.props.dockerfilePath ? (
          <InputRow
            disabled={true}
            label="Dockerfile Path"
            type="text"
            width="100%"
            value={this.props.dockerfilePath}
          />
        ) : (
          <InputRow
            disabled={true}
            label="Folder Path"
            type="text"
            width="100%"
            value={this.props.folderPath}
          />
        )}
        <AdvancedHeader>Advanced Settings</AdvancedHeader>
        <Br />
      </>
    );
  }
}

ActionDetails.contextType = Context;

const AdvancedHeader = styled.div`
  margin-top: 15px;
`;

const Br = styled.div`
  width: 100%;
  height: 1px;
  margin-bottom: -8px;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-bottom: -18px;
`;

const Holder = styled.div`
  padding: 0px 12px 24px 12px;
`;
