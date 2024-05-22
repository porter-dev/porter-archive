import React, { Component } from "react";

import styled from "styled-components";

import DockerHubForm from "./DockerHubForm";
import GKEForm from "./GKEForm";
import EKSForm from "./EKSForm";
import GCRForm from "./GCRForm";
import ECRForm from "./ECRForm";
import GitlabForm from "./GitlabForm";
import GARForm from "./GARForm";

type PropsType = {
  integrationName: string;
  closeForm: () => void;
};

type StateType = {};

export default class CreateIntegrationForm extends Component<
  PropsType,
  StateType
> {
  state = {};

  render = () => {
    switch (this.props.integrationName) {
      case "docker-hub":
        return <DockerHubForm closeForm={this.props.closeForm} />;
      case "gke":
        return <GKEForm closeForm={this.props.closeForm} />;
      case "eks":
        return <EKSForm closeForm={this.props.closeForm} />;
      case "ecr":
        return <ECRForm closeForm={this.props.closeForm} />;
      case "gcr":
        return <GCRForm closeForm={this.props.closeForm} />;
      case "gar":
        return <GARForm closeForm={this.props.closeForm} />;
      case "gitlab":
        return <GitlabForm closeForm={this.props.closeForm} />;
      default:
        return null;
    }
  };
}
