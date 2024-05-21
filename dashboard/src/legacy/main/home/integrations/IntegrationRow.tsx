import styled from "styled-components";
import React, { Component, MouseEvent, MouseEventHandler } from "react";

import ImageList from "components/image-selector/ImageList";
import RepoList from "components/repo-selector/RepoList";
import { ActionConfigType } from "shared/types";
import { integrationList } from "shared/common";

import CreateIntegrationForm from "./create-integration/CreateIntegrationForm";

type PropsType = {
  toggleCollapse: MouseEventHandler;
  triggerDelete: MouseEventHandler;
  label: string;
  integration: string;
  expanded: boolean;
  category: string; // "repo" | "registry"; see Integrations.tsx
  itemId: number;
};

type StateType = {
  editMode: boolean;
};

export default class IntegrationRow extends Component<PropsType, StateType> {
  state = {
    editMode: false,
  };

  editButtonOnClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!this.props.expanded) {
      this.setState({
        editMode: true,
      });
      this.props.toggleCollapse(null);
    } else {
      this.setState({
        editMode: !this.state.editMode,
      });
      if (this.state.editMode) {
        this.props.toggleCollapse(null);
      }
    }
  };

  render = () => {
    const icon =
      integrationList[this.props.integration] &&
      integrationList[this.props.integration].icon;
    const subtitle =
      integrationList[this.props.integration] &&
      integrationList[this.props.integration].label;
    return (
      <Integration disabled={false}>
        <MainRow onClick={this.props.toggleCollapse} disabled={false}>
          <Flex>
            <Icon src={icon ? icon : "https://avatars2.githubusercontent.com/u/52505464?s=400&u=da920f994c67665c7ad6c606a5286557d4f8555f&v=4"} />
            <Description>
              <Label>{this.props.label}</Label>
              <Subtitle>{subtitle}</Subtitle>
            </Description>
          </Flex>
          <MaterialIconTray disabled={false}>
            {/* <i className="material-icons"
            onClick={this.editButtonOnClick}>mode_edit</i> */}
            <i className="material-icons" onClick={this.props.triggerDelete}>
              delete
            </i>
            <I
              className="material-icons"
              showList={this.props.expanded}
              onClick={this.props.toggleCollapse}
            >
              expand_more
            </I>
          </MaterialIconTray>
        </MainRow>
        {this.props.expanded && !this.state.editMode && (
          <ImageHolder adjustMargin={this.props.category !== "repo"}>
            {this.props.category !== "repo" ? (
              <ImageList
                selectedImageUrl={null}
                selectedTag={null}
                clickedImage={null}
                registry={this.props.itemId}
                setSelectedImageUrl={() => {}}
                setSelectedTag={() => {}}
                setClickedImage={() => {}}
              />
            ) : (
              <RepoList
                actionConfig={
                  {
                    git_repo: "",
                    image_repo_uri: "",
                    git_branch: "",
                    git_repo_id: 0,
                    dockerfile_path: "",
                  } as ActionConfigType
                }
                setActionConfig={() => {}}
                readOnly={true}
                userId={this.props.itemId}
              />
            )}
          </ImageHolder>
        )}
        {this.props.expanded && this.state.editMode && (
          <CreateIntegrationForm
            integrationName={this.props.integration}
            closeForm={() => {
              this.setState({ editMode: false });
            }}
          />
        )}
      </Integration>
    );
  };
}

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  margin-bottom: 15px;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 18px;
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  padding-left: 20px;
  padding-right: 30px;
  border-radius: 5px;
  :hover {
    > i {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: #ffffff44;
    margin-right: -7px;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const MaterialIconTray = styled.div`
  max-width: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  > i {
    border-radius: 20px;
    font-size: 18px;
    border: 1px solid #494b4f;
    padding: 5px;
    margin: 0 5px;
    color: #ffffff44;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Description = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const Subtitle = styled.div`
  color: #aaaabb;
  font-size: 13px;
  display: flex;
  align-items: center;
  padding-top: 5px;
`;

const I = styled.i`
  transform: ${(props: { showList: boolean }) =>
    props.showList ? "rotate(180deg)" : ""};
`;

const ImageHolder = styled.div`
  width: 100%;
  padding: 12px;
  margin-top: ${(props: { adjustMargin: boolean }) =>
    props.adjustMargin ? "-10px" : "0px"};
`;
