import React, { Component } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import { pushFiltered } from "shared/routing";

import { Context } from "shared/Context";

type PropsType = RouteComponentProps & {};

type StateType = {};

class NoClusterPlaceholder extends Component<PropsType, StateType> {
  state = {};

  render() {
    let { setCurrentModal, currentProject } = this.context;

    return (
      <StyledNoClusterPlaceholder>
        <Bold>
          <i className="material-icons">tips_and_updates</i>
          Porter - Getting Started
        </Bold>
        <br />
        <br />
        1. If you're deploying from a repo{" "}
        <A
          onClick={() =>
            window.open(`/api/oauth/projects/${currentProject.id}/github`)
          }
        >
          link your GitHub account
        </A>
        <br />
        <br />
        2.{" "}
        <A
          onClick={() =>
            pushFiltered(this.props, "/dashboard", ["project_id"], {
              tab: "create-cluster",
            })
          }
        >
          Create a new cluster
        </A>{" "}
        or{" "}
        <A onClick={() => setCurrentModal("ClusterInstructionsModal")}>
          add an existing cluster
        </A>{" "}
        *
        <br />
        <br />
        3. To receive community updates{" "}
        <A onClick={() => window.open("https://discord.gg/34n7NN7FJ7")}>
          join our official Discord
        </A>
        <br />
        <br />
        <br />* Required. For more information{" "}
        <A onClick={() => window.open("https://docs.getporter.dev/docs")}>
          refer to our docs
        </A>
      </StyledNoClusterPlaceholder>
    );
  }
}

NoClusterPlaceholder.contextType = Context;

export default withRouter(NoClusterPlaceholder);

const A = styled.a`
  color: #ffffff;
  text-decoration: underline;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
`;

const StyledNoClusterPlaceholder = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #6f6f6f;
  font-size: 16px;
  margin-top: 12px;
  user-select: none;
`;

const Bold = styled.div`
  font-weight: bold;
  font-size: 20px;
  display: flex;
  align-items: center;

  > i {
    font-size: 23px;
    margin-right: 12px;
  }
`;
