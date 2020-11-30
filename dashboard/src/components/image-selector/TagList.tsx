import React, { Component } from 'react';
import styled from 'styled-components';
import tag_icon from '../../assets/tag.png';
import info from '../../assets/info.svg';

import api from '../../shared/api';
import { Context } from '../../shared/Context';

import Loading from '../Loading';

type PropsType = {
  setSelectedImageUrl: (x: string) => void,
  selectedImageUrl: string,
  registryId: number,
};

type StateType = {
  loading: boolean,
  error: boolean,
  tags: string[],
  currentTag: string | null,
};

export default class TagList extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
    tags: [] as string[],
    currentTag: null as string | null,
  }

  componentDidMount() {
    const { currentProject } = this.context;
    api.getImageTags('<token>', {}, 
      { 
        project_id: currentProject.id,
        registry_id: this.props.registryId,
        repo_name: this.props.selectedImageUrl,
      }, (err: any, res: any) => {
      if (err) {
        this.setState({ loading: false, error: true });
      } else {
        let tags = res.data.map((tag: any, i: number) => {
          return tag.tag;
        });
        this.setState({ tags, loading: false });
      }
    });
  }

  setTag = (tag: string) => {
    let { selectedImageUrl, setSelectedImageUrl} = this.props;
    let splits = selectedImageUrl.split(':');
    if (splits[splits.length - 1] === this.state.currentTag) {
      selectedImageUrl = splits.reduce((acc: string, curr: string) => {
        if (curr !== this.state.currentTag) {
          return acc + ':' + curr;
        } else {
          return acc;
        }
      });
    }
    setSelectedImageUrl(selectedImageUrl + ':' + tag);
    this.setState({ currentTag: tag });
  }

  renderTagList = () => {
    let { tags, loading, error } = this.state;
    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error || !tags) {
      return <LoadingWrapper>Error loading tags</LoadingWrapper>
    }

    return tags.map((tag: string, i: number) => {
      return (
        <TagName
          key={i}
          isSelected={tag === this.state.currentTag}
          lastItem={i === tags.length - 1}
          onClick={() => this.setTag(tag)}
        >
          <img src={tag_icon} />{tag}
        </TagName>
      );
    });
  }

  render() {
    return (
      <div>
        <TagNameAlt>
          <img src={info} /> Select Image Tag
        </TagNameAlt>
        {this.renderTagList()}
      </div>
    );
  }
}

TagList.contextType = Context;

const TagName = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid ${(props: { lastItem?: boolean, isSelected?: boolean }) => props.lastItem ? '#00000000' : '#606166'};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected?: boolean, lastItem?: boolean }) => props.isSelected ? '#ffffff22' : '#ffffff11'};
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
  }
`;

const TagNameAlt = styled(TagName)`
  color: #ffffff55;
  cursor: default;
  :hover {
    background: #ffffff11;
    > i {
      background: none;
    }
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #ffffff44;
`;