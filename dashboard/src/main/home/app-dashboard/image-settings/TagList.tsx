import React, { useState } from "react";
import styled from "styled-components";

import Loading from "components/Loading";
import SearchBar from "components/SearchBar";

import addCircle from "assets/add-circle.png";
import tag_icon from "assets/tag.png";

import { type ArtifactType, type ImageType } from "./types";

type Props = {
  selectedImage?: ImageType;
  setSelectedTag: (x: string) => void;
  loading: boolean;
};

const TagList: React.FC<Props> = ({
  selectedImage,
  setSelectedTag,
  loading,
}) => {
  const [searchFilter, setSearchFilter] = useState<string>("");

  const renderTagList = (): JSX.Element => {
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading message={"Loading all images linked to your project"} />
        </LoadingWrapper>
      );
    } else if (selectedImage == null) {
      if (searchFilter) {
        return (
          <TagItem
            onClick={() => {
              setSelectedTag(searchFilter);
            }}
          >
            <img src={addCircle} />
            {`Use tag "${searchFilter}"`}
          </TagItem>
        );
      }
      return <LoadingWrapper>Please specify a tag.</LoadingWrapper>;
    }

    if (selectedImage.artifacts.length === 0 && !searchFilter) {
      return (
        <LoadingWrapper>
          Image has no tags; please specify a different image.
        </LoadingWrapper>
      );
    }

    const sortedArtifacts = searchFilter
      ? selectedImage.artifacts
          .filter(({ tag }) =>
            tag.toLowerCase().includes(searchFilter.toLowerCase())
          )
          .sort((a, b) => {
            const aIndex = a.tag
              .toLowerCase()
              .indexOf(searchFilter.toLowerCase());
            const bIndex = b.tag
              .toLowerCase()
              .indexOf(searchFilter.toLowerCase());
            return aIndex - bIndex;
          })
      : selectedImage.artifacts.sort((a, b) => {
          return (
            new Date(b.updated_at ?? "").getTime() -
            new Date(a.updated_at ?? "").getTime()
          );
        });

    const tagCards = sortedArtifacts.map(
      (artifact: ArtifactType, i: number) => {
        return (
          <TagItem
            key={i}
            onClick={() => {
              setSelectedTag(artifact.tag);
            }}
          >
            <img src={tag_icon} />
            {artifact.tag}
          </TagItem>
        );
      }
    );

    if (
      searchFilter !== "" &&
      !sortedArtifacts.some(({ tag }) => tag === searchFilter)
    ) {
      tagCards.push(
        <TagItem
          onClick={() => {
            setSelectedTag(searchFilter);
          }}
        >
          <img src={addCircle} />
          {`Use tag "${searchFilter}"`}
        </TagItem>
      );
    }

    return <>{tagCards}</>;
  };

  return (
    <>
      <SearchBar
        setSearchFilter={setSearchFilter}
        disabled={false}
        prompt={"Search tags..."}
      />
      <ExpandedWrapper>{renderTagList()}</ExpandedWrapper>
    </>
  );
};

export default TagList;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  background: #ffffff11;
  overflow-y: auto;
`;

const TagItem = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid #606166;
  color: #ffffff;
  align-items: center;
  padding: 10px 0px;
  user-select: text;
  cursor: text;
  :hover {
    background: #ffffff22;
    cursor: pointer;
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

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
`;
