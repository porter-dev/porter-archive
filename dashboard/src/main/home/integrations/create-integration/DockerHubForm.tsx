import React, { Component } from "react";
import styled from "styled-components";

import InputRow from "components/values-form/InputRow";
import SaveButton from "components/SaveButton";

type PropsType = {
  closeForm: () => void;
};

type StateType = {
  registryURL: string;
  dockerEmail: string;
  dockerUsername: string;
  dockerPassword: string;
};

export default class DockerHubForm extends Component<PropsType, StateType> {
  state = {
    registryURL: "",
    dockerEmail: "",
    dockerUsername: "",
    dockerPassword: "",
  };

  isDisabled = (): boolean => {
    let {
      registryURL,
      dockerEmail,
      dockerUsername,
      dockerPassword,
    } = this.state;
    if (
      registryURL === "" ||
      dockerEmail === "" ||
      dockerUsername === "" ||
      dockerPassword === ""
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
          <InputRow
            type="text"
            value={this.state.registryURL}
            setValue={(x: string) => this.setState({ registryURL: x })}
            label="📦 Registry URL"
            placeholder="ex: index.docker.io"
            width="100%"
          />
          <InputRow
            type="text"
            value={this.state.dockerEmail}
            setValue={(x: string) => this.setState({ dockerEmail: x })}
            label="✉️ Docker Email"
            placeholder="ex: captain@ahab.com"
            width="100%"
          />
          <InputRow
            type="text"
            value={this.state.dockerUsername}
            setValue={(x: string) => this.setState({ dockerUsername: x })}
            label="👤 Docker Username"
            placeholder="ex: whale_watcher_2000"
            width="100%"
          />
          <InputRow
            type="password"
            value={this.state.dockerPassword}
            setValue={(x: string) => this.setState({ dockerPassword: x })}
            label="🔒 Docker Password"
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
