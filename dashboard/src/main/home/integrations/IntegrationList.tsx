import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "../../../shared/Context";
import { integrationList } from "../../../shared/common";
import { ImageType, ActionConfigType } from "../../..//shared/types";
import ImageList from "../../../components/image-selector/ImageList";
import RepoList from "../../../components/repo-selector/RepoList";

type PropsType = {
  setCurrent: (x: any) => void;
  currentCategory: string;
  integrations: string[];
  itemIdentifier?: any[];
  titles?: string[];
  isCategory?: boolean;
};

type StateType = {
  displayImages: boolean[];
  allCollapsed: boolean;
};

export default class IntegrationList extends Component<PropsType, StateType> {
  state = {
    displayImages: [] as boolean[],
    allCollapsed: false,
  };

  componentDidMount() {
    let x: boolean[] = [];
    for (let i = 0; i < this.props.integrations.length; i++) {
      x.push(true);
    }
    this.setState({ displayImages: x });

    this.toggleDisplay = this.toggleDisplay.bind(this);
    this.handleParent = this.handleParent.bind(this);
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.integrations !== this.props.integrations) {
      let x: boolean[] = [];
      for (let i = 0; i < this.props.integrations.length; i++) {
        x.push(true);
      }
      this.setState({ displayImages: x });
    }
  }

  collapseAll = () => {
    let x = [];
    for (let i = 0; i < this.state.displayImages.length; i++) {
      x.push(false);
    }
    this.setState({ displayImages: x, allCollapsed: true });
  };

  expandAll = () => {
    let x = [];
    for (let i = 0; i < this.state.displayImages.length; i++) {
      x.push(true);
    }
    this.setState({ displayImages: x, allCollapsed: false });
  };

  toggleDisplay = (event: any, index: number) => {
    event.stopPropagation();
    let x = this.state.displayImages;
    x[index] = !x[index];
    if (x[index]) {
      this.setState({ allCollapsed: false });
    } else {
      let collapsed = true;
      for (let i = 0; i < x.length; i++) {
        if (x[i]) {
          collapsed = false;
          break;
        }
      }
      if (collapsed) {
        this.setState({ allCollapsed: true });
      } else {
        this.setState({ allCollapsed: false });
      }
    }
    this.setState({ displayImages: x });
  };

  handleParent = (event: any, integration: string) => {
    this.props.setCurrent(integration);
  };

  renderContents = () => {
    let {
      integrations,
      titles,
      setCurrent,
      isCategory,
      currentCategory,
    } = this.props;
    if (titles && titles.length > 0) {
      return integrations.map((integration: string, i: number) => {
        let icon =
          integrationList[integration] && integrationList[integration].icon;
        let subtitle =
          integrationList[integration] && integrationList[integration].label;
        let label = titles[i];
        return (
          <Integration key={i} isCategory={isCategory} disabled={false}>
            <MainRow
              onClick={(e: any) => {
                this.handleParent(e, integration);
              }}
              isCategory={isCategory}
              disabled={false}
            >
              <Flex>
                <Icon src={icon && icon} />
                <Description>
                  <Label>{label}</Label>
                  <Subtitle>{subtitle}</Subtitle>
                </Description>
              </Flex>
              <MaterialIconTray isCategory={isCategory} disabled={false}>
                <i className="material-icons">more_vert</i>
                <I
                  className="material-icons"
                  showList={this.state.displayImages[i]}
                  onClick={(e) => {
                    this.toggleDisplay(e, i);
                  }}
                >
                  {isCategory ? "launch" : "expand_more"}
                </I>
              </MaterialIconTray>
            </MainRow>
            {this.state.displayImages[i] && (
              <ImageHodler adjustMargin={currentCategory !== "repo"}>
                {currentCategory !== "repo" ? (
                  <ImageList
                    selectedImageUrl={null}
                    selectedTag={null}
                    clickedImage={null}
                    registry={this.props.itemIdentifier[i]}
                    setSelectedImageUrl={(x: string) => {}}
                    setSelectedTag={(x: string) => {}}
                    setClickedImage={(x: ImageType) => {}}
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
                    setActionConfig={(x: ActionConfigType) => {}}
                    readOnly={true}
                    userId={this.props.itemIdentifier[i]}
                  />
                )}
              </ImageHodler>
            )}
          </Integration>
        );
      });
    } else if (integrations && integrations.length > 0) {
      return integrations.map((integration: string, i: number) => {
        let icon =
          integrationList[integration] && integrationList[integration].icon;
        let label =
          integrationList[integration] && integrationList[integration].label;
        let disabled = integration === "kubernetes";
        return (
          <Integration
            key={i}
            onClick={() => (disabled ? null : setCurrent(integration))}
            isCategory={isCategory}
            disabled={disabled}
          >
            <MainRow isCategory={isCategory} disabled={disabled}>
              <Flex>
                <Icon src={icon && icon} />
                <Label>{label}</Label>
              </Flex>
              <i className="material-icons">
                {isCategory ? "launch" : "more_vert"}
              </i>
            </MainRow>
          </Integration>
        );
      });
    }
    return <Placeholder>No integrations set up yet.</Placeholder>;
  };

  render() {
    return (
      <StyledIntegrationList>
        {this.props.titles && this.props.titles.length > 0 && (
          <ControlRow>
            <Button
              onClick={() => {
                if (this.state.allCollapsed) {
                  this.expandAll();
                } else {
                  this.collapseAll();
                }
              }}
            >
              {this.state.allCollapsed ? (
                <>
                  <i className="material-icons">expand_more</i> Expand All
                </>
              ) : (
                <>
                  <i className="material-icons">expand_less</i> Collapse All
                </>
              )}
            </Button>
          </ControlRow>
        )}
        {this.renderContents()}
      </StyledIntegrationList>
    );
  }
}

IntegrationList.contextType = Context;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ImageHodler = styled.div`
  width: 100%;
  padding: 12px;
  margin-top: ${(props: { adjustMargin: boolean }) =>
    props.adjustMargin ? "-10px" : "0px"};
`;

const MaterialIconTray = styled.div`
  width: 64px;
  margin-right: -7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  > i {
    background: #26282f;
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: ${(props: { isCategory: boolean; disabled: boolean }) =>
      props.isCategory ? "#616feecc" : "#ffffff44"};
    :hover {
      background: ${(props: { isCategory: boolean; disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
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
    background: ${(props: { isCategory: boolean; disabled: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
    > i {
      background: ${(props: { isCategory: boolean; disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: ${(props: { isCategory: boolean; disabled: boolean }) =>
      props.isCategory ? "#616feecc" : "#ffffff44"};
    margin-right: -7px;
    :hover {
      background: ${(props: { isCategory: boolean; disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  background: #26282f;
  cursor: ${(props: { isCategory: boolean; disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  margin-bottom: 15px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
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

const Icon = styled.img`
  width: 30px;
  margin-right: 18px;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  justify-content: center;
  margin-top: 30px;
  background: #ffffff11;
  color: #ffffff44;
  border-radius: 5px;
`;

const StyledIntegrationList = styled.div`
  margin-top: 20px;
`;

const I = styled.i`
  transform: ${(props: { showList: boolean }) =>
    props.showList ? "rotate(180deg)" : ""};
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-left: 0px;
`;

const ButtonTray = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  &:first-child {
    margin-right: 14px;
  }
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 8px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
