import React, { Component } from "react";

import { Context } from "shared/Context";
import ProjectButton from "./ProjectButton";

import collapseSidebar from "assets/collapse-sidebar.svg";

import styled from "styled-components";

type PropsType = {
  collapseSidebar: any;
};

type StateType = {};


// Props in context to project section to trigger update on context change
export default class ProjectSectionContainer extends Component<
  PropsType,
  StateType
> {
  state = {};

  render() {

    return (
      <StyledProjectSection>
        <ProjectButton
          currentProject={this.context.currentProject}
          projects={this.context.projects}
        />
        <SidebarToggleButton onClick={this.props.collapseSidebar}>
          <img src={collapseSidebar} />
        </SidebarToggleButton>
      </StyledProjectSection>
    );
  }

}

ProjectSectionContainer.contextType = Context;

const SidebarToggleButton = styled.div`
  height: 25px;
  min-width: 25px;
  width: 25px;
  border-radius: 5px;
  border: 1px solid #383a3f;
  cursor: pointer;
  margin-right: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  > img {
    height: 14px;
    width: 14px;
    opacity: 0.5;
  }

  :hover {
    border: 1px solid ${props => props.theme.text.primary};
    > img {
      opacity: 0.9;
    }
  }
`;

const StyledProjectSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
