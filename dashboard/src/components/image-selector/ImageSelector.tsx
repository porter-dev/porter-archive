import React, { Component } from 'react';
import styled from 'styled-components';
import info from '../../assets/info.svg';

import api from '../../shared/api';
import { getIntegrationIcon } from '../../shared/common';
import { Context } from '../../shared/Context';

import Loading from '../Loading';

type PropsType = {
  forceExpanded?: boolean,
  selectedImageUrl: string | null,
  setSelectedImageUrl: (x: string) => void
};

type StateType = {
  isExpanded: boolean,
  loading: boolean,
  error: boolean,
  images: any[]
};

const dummyImages = [
  {
    kind: 'docker-hub',
    source: 'https://index.docker.io/jusrhee/image1',
  },
  {
    kind: 'docker-hub',
    source: 'https://index.docker.io/jusrhee/image2',
  },
  {
    kind: 'docker-hub',
    source: 'https://index.docker.io/jusrhee/image3',
  },
  {
    kind: 'gcr',
    source: 'https://gcr.io/some-registry/image1',
  },
  {
    kind: 'gcr',
    source: 'https://gcr.io/some-registry/image2',
  },
  {
    kind: 'ecr',
    source: 'https://aws_account_id.dkr.ecr.region.amazonaws.com/smth/1',
  },
  {
    kind: 'ecr',
    source: 'https://aws_account_id.dkr.ecr.region.amazonaws.com/smth/2',
  },
];

export default class ImageSelector extends Component<PropsType, StateType> {
  state = {
    isExpanded: this.props.forceExpanded,
    loading: false,
    error: false,
    images: [] as any[]
  }

  componentDidMount() {
    this.setState({ images: dummyImages });
  }

  renderImageList = () => {
    let { images, loading, error } = this.state;
    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error || !images) {
      return <LoadingWrapper>Error loading repos</LoadingWrapper>
    }

    return images.map((image: any, i: number) => {
      let icon = getIntegrationIcon(image.kind);
      return (
        <ImageItem
          key={i}
          isSelected={image.source === this.props.selectedImageUrl}
          lastItem={i === images.length - 1}
          onClick={() => this.props.setSelectedImageUrl(image.source)}
        >
          <img src={icon && icon} />{image.source}
        </ImageItem>
      );
    });
  }

  renderExpanded = () => {
    return (
      <ExpandedWrapper>
        {this.renderImageList()}
      </ExpandedWrapper>
    );
  }

  renderSelected = () => {
    let { selectedImageUrl, setSelectedImageUrl } = this.props;
    let icon = info;
    return (
      <Label>
        <img src={icon} />
        <Input
          onClick={(e: any) => e.stopPropagation()}
          value={selectedImageUrl}
          onChange={(e: any) => setSelectedImageUrl(e.value)}
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

const Input = styled.input`
  outline: 0;
  background: none;
  border: 0;
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
  background: ${(props: { isSelected: boolean, lastItem: boolean }) => props.isSelected ? '#ffffff22' : '#ffffff11'};
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
  background: #ffffff11;
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
  cursor: ${(props: { isExpanded: boolean, forceExpanded: boolean }) => props.forceExpanded ? '' : 'pointer'};;
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