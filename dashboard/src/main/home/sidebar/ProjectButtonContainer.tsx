import React, { Component } from "react";

import { Context } from "shared/Context";
import ProjectButton from "./ProjectButton";

type PropsType = {};

type StateType = {};

// Props in context to project section to trigger update on context change
export default class ProjectButtonContianer extends Component<
  PropsType,
  StateType
> {
  state = {};

  render() {
    return (
      <ProjectButton
        currentProject={this.context.currentProject}
        projects={this.context.projects}
      />
    );
  }
}

ProjectButtonContianer.contextType = Context;
