import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import InputRow from "components/form-components/InputRow";
import UploadArea from "components/form-components/UploadArea";
import SaveButton from "components/SaveButton";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

type PropsType = {
  closeForm: () => void;
};

type StateType = {
  credentialsName: string;
  serviceAccountKey: string;
  gcpProjectID: string;
  url: string;
};

export default class GCRForm extends Component<PropsType, StateType> {
  state = {
    credentialsName: "",
    serviceAccountKey: "",
    gcpProjectID: "",
    url: "",
  };

  isDisabled = (): boolean => {
    let { serviceAccountKey, credentialsName } = this.state;
    if (serviceAccountKey === "" || credentialsName === "") {
      return true;
    }
    return false;
  };

  catchError = (err: any) => console.log(err);

  handleSubmit = () => {
    let { currentProject } = this.context;

    api
      .createGCPIntegration(
        "<token>",
        {
          gcp_key_data: this.state.serviceAccountKey,
          gcp_project_id: this.state.gcpProjectID,
        },
        {
          project_id: currentProject.id,
        }
      )
      .then((res) =>
        api.connectGCRRegistry(
          "<token>",
          {
            name: this.state.credentialsName,
            gcp_integration_id: res.data.id,
            url: this.state.url,
          },
          {
            id: currentProject.id,
          }
        )
      )
      .then((res) => {
        this.props.closeForm();
      })
      .catch(this.catchError);
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
            setValue={(credentialsName: string) =>
              this.setState({ credentialsName })
            }
            isRequired={true}
            label="🏷️ Registry name"
            placeholder="ex: paper-straw"
            width="100%"
          />
          <Heading>GCP settings</Heading>
          <Helper>Service account credentials for GCP permissions.</Helper>
          <UploadArea
            setValue={(x: any) => this.setState({ serviceAccountKey: x })}
            label="🔒 GCP key data (JSON)"
            placeholder="Choose a file or drag it here."
            width="100%"
            height="100%"
            isRequired={true}
          />
          <Helper>
            GCR URI, in the form{" "}
            <CodeBlock>[gcr_domain]/[gcp_project_id]</CodeBlock>. For example,{" "}
            <CodeBlock>gcr.io/skynet-dev-172969</CodeBlock>.
          </Helper>
          <InputRow
            type="text"
            value={this.state.url}
            setValue={(url: string) => this.setState({ url })}
            label="🔗 GCR URL"
            placeholder="ex: gcr.io/skynet-dev-172969"
            width="100%"
            isRequired={true}
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

GCRForm.contextType = Context;

const CredentialWrapper = styled.div`
  padding: 30px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  margin-bottom: 30px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;

const CodeBlock = styled.span`
  display: inline-block;
  background-color: #1b1d26;
  color: white;
  border-radius: 5px;
  font-family: monospace;
  padding: 2px 3px;
  margin-top: -2px;
  user-select: text;
`;
