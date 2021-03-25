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
            <Icon src={icon && icon} />
            <Description>
              <Label>{this.props.label}</Label>
              <Subtitle>{subtitle}</Subtitle>
            </Description>
          </Flex>
          <MaterialIconTray disabled={false}>
            {/* <i className="material-icons"
            onClick={this.editButtonOnClick}>mode_edit</i> */}
            <i
              className="material-icons"
              onClick={this.props.triggerDelete}
            >
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
          <ImageHodler adjustMargin={this.props.category !== "repo"}>
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
                    git_repo_id: 0,
                    dockerfile_path: "",
                  } as ActionConfigType
                }
                setActionConfig={() => {}}
                readOnly={true}
                userId={this.props.itemId}
              />
            )}
          </ImageHodler>
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
  background: #26282f;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  margin-bottom: 15px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
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
  padding: 25px;
  border-radius: 5px;
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
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
    background: #26282f;
    border-radius: 20px;
    font-size: 18px;
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

const ImageHodler = styled.div`
  width: 100%;
  padding: 12px;
  margin-top: ${(props: { adjustMargin: boolean }) =>
    props.adjustMargin ? "-10px" : "0px"};
`;
