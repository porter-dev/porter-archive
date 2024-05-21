import React, { Component } from "react";
import styled from "styled-components";

import InputRow from "components/form-components/InputRow";
import TextArea from "components/form-components/TextArea";
import SaveButton from "components/SaveButton";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

type PropsType = {
  closeForm: () => void;
};

type StateType = {
  clusterName: string;
  clusterEndpoint: string;
  clusterCA: string;
  serviceAccountKey: string;
};

export default class GKEForm extends Component<PropsType, StateType> {
  state = {
    clusterName: "",
    clusterEndpoint: "",
    clusterCA: "",
    serviceAccountKey: "",
  };

  isDisabled = (): boolean => {
    let {
      clusterName,
      clusterEndpoint,
      clusterCA,
      serviceAccountKey,
    } = this.state;
    if (
      clusterName === "" ||
      clusterEndpoint === "" ||
      clusterCA === "" ||
      serviceAccountKey === ""
    ) {
      return true;
    }
    return false;
  };

  handleSubmit = () => {
    // TODO: implement once api is restructured
  };

  // readFile = (env: string) => {
  //   console.log(env)
  //   event.preventDefault()
  //   const reader = new FileReader()
  //   reader.onload = async (e) => {
  //     let text = (e.target.result)
  //     let env = this.parseEnv(text, null)

  //     for (let key in env) {
  //       // filter duplicate keys
  //       let dup = this.state.values.filter((el) => {
  //         console.log(el, key)
  //         if (el["key"] == key) {
  //           return false
  //         }
  //       })

  //       console.log(dup)

  //       this.state.values.push({ key, value: env[key] });
  //     }
  //     this.setState({ values: this.state.values });
  //   }
  //   reader.readAsText(event.target.files[0], 'UTF-8')
  // }

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

          <Heading>GCP Settings</Heading>
          <Helper>Service account credentials for GCP permissions.</Helper>
          <TextArea
            value={this.state.serviceAccountKey}
            setValue={(x: string) => this.setState({ serviceAccountKey: x })}
            label="🔑 Service Account Key (JSON)"
            placeholder="(Paste your JSON service account key here)"
            width="100%"
          />
        </CredentialWrapper>
        <SaveButton
          text="Save Settings"
          makeFlush={true}
          disabled={this.isDisabled()}
          onClick={this.isDisabled() ? null : this.handleSubmit}
        />

        {/* <UploadButton
      onClick={()=>{
        // document.getElementById("file").click();
        this.setState({ showEditorModal: true });
      }}
      >
      <img src={upload} /> Copy from File
      {<input id='file' hidden type="file" onChange={(event) => {
        this.readFile(event)
        event.currentTarget.value = null
      }}/>}
    </UploadButton> */}
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
