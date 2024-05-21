import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

type PropsType = {
  closeForm: () => void;
};

type StateType = {
  credentialsName: string;
  awsRegion: string;
  awsAccessId: string;
  awsSecretKey: string;
};

export default class ECRForm extends Component<PropsType, StateType> {
  state = {
    credentialsName: "",
    awsRegion: "",
    awsAccessId: "",
    awsSecretKey: "",
  };

  isDisabled = (): boolean => {
    let { awsRegion, awsAccessId, awsSecretKey, credentialsName } = this.state;
    if (
      awsRegion === "" ||
      awsAccessId === "" ||
      awsSecretKey === "" ||
      credentialsName === ""
    ) {
      return true;
    }
    return false;
  };

  catchErr = (err: any) => console.log(err);

  handleSubmit = () => {
    let { awsRegion, awsAccessId, awsSecretKey, credentialsName } = this.state;
    let { currentProject } = this.context;

    api
      .createAWSIntegration(
        "<token>",
        {
          aws_region: awsRegion,
          aws_access_key_id: awsAccessId,
          aws_secret_access_key: awsSecretKey,
        },
        { id: currentProject.id }
      )
      .then((res) =>
        api.connectECRRegistry(
          "<token>",
          {
            name: credentialsName,
            aws_integration_id: res.data.id,
          },
          { id: currentProject.id }
        )
      )
      .then(() => this.props.closeForm())
      .catch(this.catchErr);
  };

  render() {
    return (
      <StyledForm>
        <CredentialWrapper>
          <Heading isAtTop>Porter settings</Heading>
          <Helper>
            Give a name to this set of registry credentials (just for Porter).
          </Helper>
          <InputRow
            type="text"
            value={this.state.credentialsName}
            setValue={(x: string) => this.setState({ credentialsName: x })}
            label="🏷️ Registry Name"
            placeholder="ex: paper-straw"
            width="100%"
          />
          <Heading>AWS settings</Heading>
          <Helper>AWS access credentials.</Helper>
          <InputRow
            type="text"
            value={this.state.awsRegion}
            setValue={(x: string) => this.setState({ awsRegion: x })}
            label="📍 AWS region"
            placeholder="ex: mars-north-12"
            width="100%"
          />
          <InputRow
            type="text"
            value={this.state.awsAccessId}
            setValue={(x: string) => this.setState({ awsAccessId: x })}
            label="👤 AWS access ID"
            placeholder="ex: AKIAIOSFODNN7EXAMPLE"
            width="100%"
          />
          <InputRow
            type="password"
            value={this.state.awsSecretKey}
            setValue={(x: string) => this.setState({ awsSecretKey: x })}
            label="🔒 AWS secret key"
            placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
            width="100%"
          />
        </CredentialWrapper>
        <SaveButton
          text="Save settings"
          makeFlush={true}
          clearPosition={true}
          statusPosition="right"
          disabled={this.isDisabled()}
          onClick={this.isDisabled() ? null : this.handleSubmit}
        />
      </StyledForm>
    );
  }
}

ECRForm.contextType = Context;

const CredentialWrapper = styled.div`
  padding: 30px;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg}};
  border: 1px solid #494b4f;
  margin-bottom: 30px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;
