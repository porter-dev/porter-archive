import React, { Component } from "react";
import styled from "styled-components";

import api from "shared/api";
import { integrationList } from "shared/common";
import { Context } from "shared/Context";
import { ImageType } from "shared/types";

import Loading from "../Loading";
import TagList from "./TagList";

type PropsType = {
  selectedImageUrl: string | null;
  selectedTag: string | null;
  clickedImage: ImageType | null;
  registry?: any;
  noTagSelection?: boolean;
  setSelectedImageUrl: (x: string) => void;
  setSelectedTag: (x: string) => void;
  setClickedImage: (x: ImageType) => void;
};

type StateType = {
  loading: boolean;
  error: boolean;
  images: ImageType[];
};

export default class ImageList extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
    images: [] as ImageType[],
  };

  // TODO: Try to unhook before unmount
  componentDidMount() {
    const { currentProject, setCurrentError } = this.context;
    let images = [] as ImageType[];
    let errors = [] as number[];

    if (!this.props.registry) {
      api
        .getProjectRegistries("<token>", {}, { id: currentProject.id })
        .then((res) => {
          let registries = res.data;
          if (registries.length === 0) {
            this.setState({ loading: false });
          }
          // Loop over connected image registries
          // TODO: promise.map the whole thing
          registries.forEach(async (registry: any, i: number) => {
            await new Promise(
              (resolveToNextController: (res?: any) => void) => {
                api
                  .getImageRepos(
                    "<token>",
                    {},
                    {
                      project_id: currentProject.id,
                      registry_id: registry.id,
                    }
                  )
                  .then((res) => {
                    res.data.sort((a: any, b: any) =>
                      a.name > b.name ? 1 : -1
                    );
                    // Loop over found image repositories
                    let newImg = res.data.map((img: any) => {
                      if (this.props.selectedImageUrl === img.uri) {
                        this.props.setClickedImage({
                          kind: registry.service,
                          source: img.uri,
                          name: img.name,
                          registryId: registry.id,
                        });
                      }
                      return {
                        kind: registry.service,
                        source: img.uri,
                        name: img.name,
                        registryId: registry.id,
                      };
                    });
                    images.push(...newImg);
                    errors.push(0);
                  })
                  .catch((err) => errors.push(1))
                  .finally(() => {
                    if (i == registries.length - 1) {
                      let error =
                        errors.reduce((a, b) => {
                          return a + b;
                        }) == registries.length
                          ? true
                          : false;

                      this.setState({
                        images,
                        loading: false,
                        error,
                      });
                    } else {
                      this.setState({
                        images,
                      });
                    }

                    resolveToNextController();
                  });
              }
            );
          });
        })
        .catch((err) => {
          console.log(err);
          this.setState({ loading: false, error: true });
        });
    } else {
      api
        .getImageRepos(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            registry_id: this.props.registry.id,
          }
        )
        .then((res) => {
          res.data.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
          // Loop over found image repositories
          let newImg = res.data.map((img: any) => {
            if (this.props.selectedImageUrl === img.uri) {
              this.props.setClickedImage({
                kind: this.props.registry.service,
                source: img.uri,
                name: img.name,
                registryId: this.props.registry.id,
              });
            }
            return {
              kind: this.props.registry.service,
              source: img.uri,
              name: img.name,
              registryId: this.props.registry.id,
            };
          });
          images.push(...newImg);

          this.setState({
            images,
            loading: false,
            error: false,
          });
        })
        .catch((err) =>
          this.setState({
            loading: false,
            error: true,
          })
        );
    }
  }

  /*
  <Highlight onClick={() => this.props.setCurrentView('integrations')}>
    Link your registry.
  </Highlight>
  */
  renderImageList = () => {
    let { images, loading, error } = this.state;

    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error || !images) {
      return <LoadingWrapper>Error loading repos</LoadingWrapper>;
    } else if (images.length === 0) {
      return <LoadingWrapper>No registries found.</LoadingWrapper>;
    }

    return images.map((image: ImageType, i: number) => {
      let icon =
        integrationList[image.kind] && integrationList[image.kind].icon;
      if (!icon) {
        icon = integrationList["docker"].icon;
      }
      return (
        <ImageItem
          key={i}
          isSelected={image.source === this.props.selectedImageUrl}
          lastItem={i === images.length - 1}
          onClick={() => {
            this.props.setSelectedImageUrl(image.source);
            this.props.setClickedImage(image);
          }}
        >
          <img src={icon && icon} />
          {image.source}
        </ImageItem>
      );
    });
  };

  renderBackButton = () => {
    let { setSelectedImageUrl } = this.props;
    if (this.props.clickedImage) {
      return (
        <BackButton
          width="175px"
          onClick={() => {
            setSelectedImageUrl("");
            this.props.setClickedImage(null);
          }}
        >
          <i className="material-icons">keyboard_backspace</i>
          Select Image Repo
        </BackButton>
      );
    }
  };

  renderExpanded = () => {
    let { selectedTag, selectedImageUrl, setSelectedTag } = this.props;

    if (!this.props.clickedImage || this.props.noTagSelection) {
      return (
        <div>
          <ExpandedWrapper>{this.renderImageList()}</ExpandedWrapper>
          {this.renderBackButton()}
        </div>
      );
    } else {
      return (
        <div>
          <ExpandedWrapper>
            <TagList
              selectedTag={selectedTag}
              selectedImageUrl={selectedImageUrl}
              setSelectedTag={setSelectedTag}
              registryId={this.props.clickedImage.registryId}
            />
          </ExpandedWrapper>
          {this.renderBackButton()}
        </div>
      );
    }
  };

  render() {
    return <>{this.renderExpanded()}</>;
  }
}

ImageList.contextType = Context;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28px;
  margin-bottom: -6px;
  height: 35px;
  cursor: pointer;
  font-size: 13px;
  padding: 5px 13px;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const ImageItem = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; isSelected: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected: boolean; lastItem: boolean }) =>
    props.isSelected ? "#ffffff11" : ""};
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    filter: grayscale(100%);
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  display: flex;
  align-items: center;
  font-size: 13px;
  justify-content: center;
  color: #ffffff44;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  background: #ffffff11;
  overflow-y: auto;
`;
