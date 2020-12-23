import React, { Component } from 'react';
import styled from 'styled-components';
import info from '../../assets/info.svg';
import edit from '../../assets/edit.svg';

import api from '../../shared/api';
import { integrationList } from '../../shared/common';
import { Context } from '../../shared/Context';
import { ImageType } from '../../shared/types';

import Loading from '../Loading';
import TagList from './TagList';

type PropsType = {
  forceExpanded?: boolean,
  selectedImageUrl: string | null,
  selectedTag: string | null,
  setSelectedImageUrl: (x: string) => void,
  setSelectedTag: (x: string) => void,
  setCurrentView: (x: string) => void,
};

type StateType = {
  isExpanded: boolean,
  loading: boolean,
  error: boolean,
  images: ImageType[],
  clickedImage: ImageType | null,
};

export default class ImageSelector extends Component<PropsType, StateType> {
  state = {
    isExpanded: this.props.forceExpanded,
    loading: true,
    error: false,
    images: [] as ImageType[],
    clickedImage: null as ImageType | null,
  }

  componentDidMount() {
    const { currentProject, setCurrentError } = this.context;
    let images = [] as ImageType[]
    let errors = [] as number[]
    api.getProjectRegistries('<token>', {}, { id: currentProject.id }, async (err: any, res: any) => {
      if (err) {
        console.log(err);
        this.setState({ error: true });
      } else {
        let registries = res.data;
        if (registries.length === 0) {
          this.setState({ loading: false });
        }

        // Loop over connected image registries
        registries.forEach(async (registry: any, i: number) => {
          await new Promise((nextController: (res?: any) => void) => {           
            api.getImageRepos('<token>', {}, 
              { 
                project_id: currentProject.id,
                registry_id: registry.id,
              }, (err: any, res: any) => {
              if (err) {
                errors.push(1);
              } else {

                // Loop over found image repositories
                let newImg = res.data.map((img: any) => {
                  if (this.props.selectedImageUrl === img.uri) {
                    this.setState({ 
                      clickedImage: {
                        kind: registry.service,
                        source: img.uri,
                        name: img.name,
                        registryId: registry.id,
                      }
                    });
                  }
                  return {
                    kind: registry.service, 
                    source: img.uri,
                    name: img.name,
                    registryId: registry.id,
                  }
                })
                images.push(...newImg)
                errors.push(0);
              }
              
              if (i == registries.length - 1) {
                let error = errors.reduce((a, b) => {
                  return a + b;
                }) == registries.length ? true : false; 

                this.setState({
                  images,
                  loading: false,
                  error,
                });
              }

              nextController()
            });    
          })
        });
      }
    });
  }

  /*
  <Highlight onClick={() => this.props.setCurrentView('integrations')}>
    Link your registry.
  </Highlight>
  */
  renderImageList = () => {
    let { images, loading, error } = this.state;
    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error || !images) {
      return <LoadingWrapper>Error loading repos</LoadingWrapper>
    } else if (images.length === 0) {
      return (
        <LoadingWrapper>
          No registries found. 
        </LoadingWrapper>
      );
    }

    return images.map((image: ImageType, i: number) => {
      let icon = integrationList[image.kind] && integrationList[image.kind].icon;
      if (!icon) {
        icon = integrationList['docker'].icon;
      }
      return (
        <ImageItem
          key={i}
          isSelected={image.source === this.props.selectedImageUrl}
          lastItem={i === images.length - 1}
          onClick={() => { 
            this.props.setSelectedImageUrl(image.source);
            this.setState({ clickedImage: image });
          }}
        >
          <img src={icon && icon} />{image.source}
        </ImageItem>
      );
    });
  }

  renderBackButton = () => {
    let { setSelectedImageUrl } = this.props;
    if (this.state.clickedImage) {
      return (
        <BackButton
          width='175px'
          onClick={() => {
            setSelectedImageUrl('');
            this.setState({ clickedImage: null });
          }}
        >
          <i className="material-icons">keyboard_backspace</i>
          Select Image Repo
        </BackButton>
      );
    }
  }

  renderExpanded = () => {
    let { selectedTag, selectedImageUrl, setSelectedTag } = this.props;
    if (!this.state.clickedImage) {
      return (
        <div>
          <ExpandedWrapper>
            {this.renderImageList()}
          </ExpandedWrapper>
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
              registryId={this.state.clickedImage.registryId}
            />
          </ExpandedWrapper>
          {this.renderBackButton()}
        </div>
      );
    }
  }

  renderSelected = () => {
    let { selectedImageUrl, setSelectedImageUrl } = this.props;
    let { clickedImage } = this.state;
    let icon = info;
    if (clickedImage) {
      icon = clickedImage.kind;
      icon = integrationList[clickedImage.kind] && integrationList[clickedImage.kind].icon;
      if (!icon) {
        icon = integrationList['docker'].icon;
      }
    } else if (selectedImageUrl && selectedImageUrl !== '') {
      icon = edit;
    }
    return (
      <Label>
        <img src={icon} />
        <Input
          onClick={(e: any) => e.stopPropagation()}
          value={selectedImageUrl}
          onChange={(e: any) => { 
            setSelectedImageUrl(e.target.value); 
            this.setState({ clickedImage: null });
          }}
          placeholder='Enter or select your container image URL'
        />
      </Label>
    );
  }

  handleClick = () => {
    if (!this.props.forceExpanded) {
      this.setState({ isExpanded: !this.state.isExpanded });
    }
  }

  render() {
    return (
      <div>
        <StyledImageSelector
          onClick={this.handleClick}
          isExpanded={this.state.isExpanded}
          forceExpanded={this.props.forceExpanded}
        >
          {this.renderSelected()}
          {this.props.forceExpanded ? null : <i className="material-icons">{this.state.isExpanded ? 'close' : 'build'}</i>}
        </StyledImageSelector>

        {this.state.isExpanded ? this.renderExpanded() : null}
      </div>
    );
  }
}

ImageSelector.contextType = Context;

const Highlight = styled.div`
  text-decoration: underline;
  margin-left: 10px;
  color: #949eff;
  cursor: pointer;
  padding: 3px 0;
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
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

const Input = styled.input`
  outline: 0;
  background: none;
  border: 0;
  font-size: 13px;
  width: calc(100% - 60px);
  color: white;
`;

const ImageItem = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid ${(props: { lastItem: boolean, isSelected: boolean }) => props.lastItem ? '#00000000' : '#606166'};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected: boolean, lastItem: boolean }) => props.isSelected ? '#ffffff11' : ''};
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

const Label = styled.div`
  display: flex;
  align-items: center;
  flex: 1;

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const StyledImageSelector = styled.div`
  width: 100%;
  border: 1px solid #ffffff55;
  background: ${(props: { isExpanded: boolean, forceExpanded: boolean }) => props.isExpanded ? '#ffffff11' : ''};
  border-radius: 3px;
  user-select: none;
  height: 40px;
  font-size: 13px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: ${(props: { isExpanded: boolean, forceExpanded: boolean }) => props.forceExpanded ? '' : 'pointer'};
  :hover {
    background: #ffffff11;

    > i {
      background: #ffffff22;
    }
  }

  > i {
    font-size: 16px;
    color: #ffffff66;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    padding: 4px;
  }
`;