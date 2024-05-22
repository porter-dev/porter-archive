import React, { Component } from "react";

import DockerHubForm from "./DockerHubForm";
import ECRForm from "./ECRForm";
import EKSForm from "./EKSForm";
import GARForm from "./GARForm";
import GCRForm from "./GCRForm";
import GitlabForm from "./GitlabForm";
import GKEForm from "./GKEForm";

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
