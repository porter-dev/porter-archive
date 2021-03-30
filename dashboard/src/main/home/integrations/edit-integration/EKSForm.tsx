import React, { Component } from "react";
import styled from "styled-components";

import InputRow from "components/values-form/InputRow";
import TextArea from "components/values-form/TextArea";
import SaveButton from "components/SaveButton";
import Heading from "components/values-form/Heading";
import Helper from "components/values-form/Helper";

type PropsType = {
  closeForm: () => void;
};

type StateType = {
  clusterName: string;
  clusterEndpoint: string;
  clusterCA: string;
  awsAccessId: string;
  awsSecretKey: string;
};

export default class EKSForm extends Component<PropsType, StateType> {
  state = {
    clusterName: "",
    clusterEndpoint: "",
    clusterCA: "",
    awsAccessId: "",
    awsSecretKey: "",
  };

  isDisabled = (): boolean => {
    let {
      clusterName,
      clusterEndpoint,
      clusterCA,
      awsAccessId,
      awsSecretKey,
    } = this.state;
    if (
      clusterName === "" ||
      clusterEndpoint === "" ||
      clusterCA === "" ||
      awsAccessId === "" ||
      awsSecretKey === ""
    ) {
      return true;
    }
    return false;
  };

  handleSubmit = () => {
    // TODO: implement once api is restructured
  };

  render() {
    return (
      <StyledForm>
        <CredentialWrapper>
          <Heading>Cluster Settings</Heading>
          <Helper>Credentials for accessing your GKE cluster.</Helper>
          <InputRow
            type="text"
            value={this.state.clusterName}
            setValue={(x: string) => this.setState({ clusterName: x })}
            label="🏷️ Cluster Name"
            placeholder="ex: briny-pagelet"
            width="100%"
          />
          <InputRow
            type="text"
            value={this.state.clusterEndpoint}
            setValue={(x: string) => this.setState({ clusterEndpoint: x })}
            label="🌐 Cluster Endpoint"
            placeholder="ex: 00.00.000.00"
            width="100%"
          />
          <TextArea
            value={this.state.clusterCA}
            setValue={(x: string) => this.setState({ clusterCA: x })}
            label="🔏 Cluster Certificate"
            placeholder="(Paste your certificate here)"
            width="100%"
          />

          <Heading>AWS Settings</Heading>
          <Helper>AWS access credentials.</Helper>
          <InputRow
            type="text"
            value={this.state.awsAccessId}
            setValue={(x: string) => this.setState({ awsAccessId: x })}
            label="👤 AWS Access ID"
            placeholder="ex: AKIAIOSFODNN7EXAMPLE"
            width="100%"
          />
          <InputRow
            type="password"
            value={this.state.awsSecretKey}
            setValue={(x: string) => this.setState({ awsSecretKey: x })}
            label="🔒 AWS Secret Key"
            placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
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

const CredentialWrapper = styled.div`
  padding: 5px 40px 25px;
  background: #ffffff11;
  border-radius: 5px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;
