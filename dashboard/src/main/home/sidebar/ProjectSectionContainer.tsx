import React, { Component } from "react";

import { Context } from "shared/Context";
import ProjectSection from "./ProjectSection";

type PropsType = {};

type StateType = {};

// Props in context to project section to trigger update on context change
export default class ProjectSectionContainer extends Component<
  PropsType,
  StateType
> {
  state = {};

  render() {
    return (
      <ProjectSection
        currentProject={this.context.currentProject}
        projects={this.context.projects}
      />
    );
  }
}

ProjectSectionContainer.contextType = Context;
