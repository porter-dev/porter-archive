import React, { Component } from "react";

import { Context } from "shared/Context";
import ClusterList from "./ClusterList";

type PropsType = {};

type StateType = {};

// Props in context to project section to trigger update on context change
export default class ClusterListContainer extends Component<
  PropsType,
  StateType
> {
  state = {};

  render() {
    return (
      <ClusterList
        currentProject={this.context.currentProject}
        projects={this.context.projects}
      />
    );
  }
}

ClusterListContainer.contextType = Context;
