import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import InputRow from "components/form-components/InputRow";
import TextArea from "components/form-components/TextArea";
import SaveButton from "components/SaveButton";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

type PropsType = {
  closeForm: () => void;
};

type StateType = {
  credentialsName: string;
  gcpRegion: string;
  serviceAccountKey: string;
  gcpProjectID: string;
  url: string;
};

export default class GCRForm extends Component<PropsType, StateType> {
  state = {
    credentialsName: "",
    gcpRegion: "",
    serviceAccountKey: "",
    gcpProjectID: "",
    url: "",
  };

  isDisabled = (): boolean => {
    let {
      credentialsName,
      gcpRegion,
      gcpProjectID,
      serviceAccountKey,
    } = this.state;
    if (
      credentialsName === "" ||
      gcpRegion === "" ||
      serviceAccountKey === "" ||
      gcpProjectID === ""
    ) {
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
          gcp_region: this.state.gcpRegion,
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
        console.log(res.data);
        this.props.closeForm();
      })
      .catch(this.catchError);
  };

  render() {
    return (
      <StyledForm>
        <CredentialWrapper>
          <Heading>Omni Settings</Heading>
          <Helper>
            Give a name to this set of registry credentials (just for Omni).
          </Helper>
          <InputRow
            type="text"
            value={this.state.credentialsName}
            setValue={(credentialsName: string) =>
              this.setState({ credentialsName })
            }
            label="🏷️ Registry Name"
            placeholder="ex: paper-straw"
            width="100%"
          />
          <Heading>GCP Settings</Heading>
          <Helper>Service account credentials for GCP permissions.</Helper>
          <InputRow
            type="text"
            value={this.state.gcpRegion}
            setValue={(gcpRegion: string) => this.setState({ gcpRegion })}
            label="📍 GCP Region"
            placeholder="ex: uranus-north3"
            width="100%"
          />
          <TextArea
            value={this.state.serviceAccountKey}
            setValue={(serviceAccountKey: string) =>
              this.setState({ serviceAccountKey })
            }
            label="🔑 Service Account Key (JSON)"
            placeholder="(Paste your JSON service account key here)"
            width="100%"
          />
          <InputRow
            type="text"
            value={this.state.gcpProjectID}
            setValue={(gcpProjectID: string) => this.setState({ gcpProjectID })}
            label="📝 GCP Project ID"
            placeholder="ex: skynet-dev-172969"
            width="100%"
          />
          <InputRow
            type="text"
            value={this.state.url}
            setValue={(url: string) => this.setState({ url })}
            label="🔗 GCR URL"
            placeholder="ex: gcr.io/skynet-dev-172969"
            width="100%"
          />
        </CredentialWrapper>
        <SaveButton
          text="Save Settings"
          makeFlush={true}
          disabled={this.isDisabled()}
          onClick={this.isDisabled() ? null : this.handleSubmit}
        />
      </StyledForm>
    );
  }
}

GCRForm.contextType = Context;

const CredentialWrapper = styled.div`
  padding: 5px 40px 25px;
  background: #ffffff11;
  border-radius: 5px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;
