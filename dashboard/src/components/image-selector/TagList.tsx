import React, { Component } from "react";
import styled from "styled-components";
import tag_icon from "assets/tag.png";
import info from "assets/info.svg";

import api from "shared/api";
import { Context } from "shared/Context";

import Loading from "../Loading";

var ecrRepoRegex = /(^[a-zA-Z0-9][a-zA-Z0-9-_]*)\.dkr\.ecr(\-fips)?\.([a-zA-Z0-9][a-zA-Z0-9-_]*)\.amazonaws\.com(\.cn)?/gim;

type PropsType =
  | {
      setSelectedTag: (x: string) => void;
      selectedTag: string;
      selectedImageUrl: string;
      registryId: number;
      readOnly?: boolean;
    }
  | {
      setSelectedTag?: (x: string) => void;
      selectedTag: string;
      selectedImageUrl: string;
      registryId: number;
      readOnly: true;
    };

type StateType = {
  loading: boolean;
  error: boolean;
  tags: string[];
  currentTag: string | null;
};

export default class TagList extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
    tags: [] as string[],
    currentTag: this.props.selectedTag,
  };

  refreshTagList = () => {
    this.setState({ loading: true });
    const { currentProject } = this.context;

    let splits = this.props.selectedImageUrl.split("/");
    let repoName: string;

    if (this.props.selectedImageUrl.includes("pkg.dev")) {
      repoName = splits[splits.length - 2] + "/" + splits[splits.length - 1];
    } else {
      repoName = splits[splits.length - 1];
    }

    let matches = this.props.selectedImageUrl.match(ecrRepoRegex);

    if (matches) {
      repoName = this.props.selectedImageUrl.split(/\/(.+)/)[1];
    }

    api
      .getImageTags(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          registry_id: this.props.registryId,
          repo_name: repoName,
        }
      )
      .then((res) => {
        let tags: any[] = res.data;
        // Sort if timestamp is available
        if (res.data.length > 0 && res.data[0].pushed_at) {
          tags = tags.sort((a: any, b: any) => {
            let d1 = new Date(a.pushed_at);
            let d2 = new Date(b.pushed_at);
            return d2.getTime() - d1.getTime();
          });
        }

        const latestImageIndex = tags.findIndex((tag) => tag.tag === "latest");
        if (latestImageIndex > -1) {
          const [latestImage] = tags.splice(latestImageIndex, 1);
          tags.unshift(latestImage);
        }
        this.setState({ tags: tags.map((tag) => tag.tag), loading: false });
      })
      .catch((err) => {
        console.log(err);
        this.setState({ loading: false, error: true });
      });
  };

  componentDidMount() {
    this.refreshTagList();
  }

  setTag = (tag: string) => {
    let { selectedTag, setSelectedTag } = this.props;
    setSelectedTag(tag);
    this.setState({ currentTag: tag });
  };

  renderTagList = () => {
    let { tags, loading, error } = this.state;
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error || !tags) {
      return <LoadingWrapper>Error loading tags</LoadingWrapper>;
    } else if (tags.length === 0) {
      return <LoadingWrapper>This image repository is empty.</LoadingWrapper>;
    }

    return tags.map((tag: string, i: number) => {
      return (
        <TagName
          key={i}
          isSelected={tag === this.state.currentTag}
          lastItem={i === tags.length - 1}
          onClick={() => this.setTag(tag)}
        >
          <img src={tag_icon} />
          {tag}
        </TagName>
      );
    });
  };

  render() {
    return (
      <>
        <TagNameAlt>
          <Label>
            <img src={info} />
            {this.props.readOnly ? "Current image tag" : "Select Image Tag"}
          </Label>
          <Refresh onClick={this.refreshTagList}>
            <i className="material-icons">autorenew</i> Refresh
          </Refresh>
        </TagNameAlt>
        <StyledTagList>{this.renderTagList()}</StyledTagList>
      </>
    );
  }
}

TagList.contextType = Context;

const Label = styled.div`
  display: flex;
  align-items: center;
  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const Refresh = styled.div`
  margin-right: 10px;
  cursor: pointer;
  color: #949eff;
  display: flex;
  align-items: center;
  font-weight: 500;
  border-radius: 3px;
  padding: 2px 3px;
  padding-right: 7px;
  > i {
    font-size: 17px;
    margin-right: 6px;
  }
  :hover {
    background: #ffffff11;
  }
`;

const StyledTagList = styled.div`
  max-height: 175px;
  position: relative;
  overflow: auto;
`;

const TagName = styled.div<{ lastItem?: boolean; isSelected?: boolean }>`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props) => (props.lastItem ? "#00000000" : "#606166")};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#ffffff11" : "")};
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff55;
  cursor: default;
  :hover {
    background: none;
    > i {
      background: none;
    }
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #ffffff44;
`;
