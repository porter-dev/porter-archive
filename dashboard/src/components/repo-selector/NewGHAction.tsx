import React, { Component } from "react";
import styled from "styled-components";

import { ChartType } from "shared/types";
import { Context } from "shared/Context";
import InputRow from "components/form-components/InputRow";

import Loading from "../Loading";

type PropsType = {
  repoName: string;
  dockerPath: string;
  grid: number;
  chart: ChartType;
  imgURL: string;
  setURL: (x: string) => void;
};

type StateType = {
  trueDockerPath: string;
  loading: boolean;
  error: boolean;
};

export default class NewGHAction extends Component<PropsType, StateType> {
  state = {
    dockerRepo: "",
    trueDockerPath: this.props.dockerPath,
    loading: false,
    error: false,
  };

  componentDidMount() {
    if (this.props.dockerPath[0] === "/") {
      this.setState({
        trueDockerPath: this.props.dockerPath.substring(
          1,
          this.props.dockerPath.length
        ),
      });
    }
  }

  renderConfirmation = () => {
    let { loading } = this.state;
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    }

    return (
      <Holder>
        <InputRow
          disabled={true}
          label="Git Repository"
          type="text"
          width="100%"
          value={this.props.repoName}
          setValue={(x: string) => console.log(x)}
        />
        <InputRow
          disabled={true}
          label="Dockerfile Path"
          type="text"
          width="100%"
          value={this.state.trueDockerPath}
          setValue={(x: string) => console.log(x)}
        />
        <InputRow
          label="Docker Image Repository"
          placeholder="Image Repo URL (ex. gcr.io/porter/mr-p)"
          type="text"
          width="100%"
          value={this.props.imgURL}
          setValue={(x: string) => this.props.setURL(x)}
        />
      </Holder>
    );
  };

  render() {
    return <div>{this.renderConfirmation()}</div>;
  }
}

NewGHAction.contextType = Context;

const Holder = styled.div`
  padding: 0px 12px;
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #ffffff44;
`;
