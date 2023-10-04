import React, { useEffect, useState } from "react";
import styled from "styled-components";
import tag_icon from "assets/tag.png";
import addCircle from "assets/add-circle.png";

import api from "shared/api";
import Loading from "components/Loading";
import { ImageType, TagType, tagValidator } from "./types";
import { useQuery } from "@tanstack/react-query";
import SearchBar from "components/SearchBar";
import { z } from "zod";

type Props = {
  selectedImage?: ImageType;
  projectId: number;
  setSelectedTag: (x: string) => void;
};

const TagList: React.FC<Props> = ({
  selectedImage,
  projectId,
  setSelectedTag,
}) => {
  const [tags, setTags] = useState<TagType[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const { data: tagResp, isLoading, error } = useQuery(
    ["getImageTags", selectedImage],
    async () => {
      if (!selectedImage) {
        return;
      }

      const res = await api.getImageTags(
        "<token>",
        {},
        {
          project_id: projectId,
          registry_id: selectedImage.registry_id,
          repo_name: selectedImage.name,
        }
      );
      return z.array(tagValidator).parseAsync(res.data);
    },
    {
      enabled: !!selectedImage && selectedImage.registry_id !== 0,
      refetchOnWindowFocus: false,
    }
  )

  useEffect(() => {
    if (tagResp) {
      setTags(tagResp);
    }
  }, [tagResp])

  const renderTagList = () => {
    if (isLoading && selectedImage && selectedImage.registry_id !== 0) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error) {
      return <LoadingWrapper>Error loading tags.</LoadingWrapper>;
    } else if (tags.length === 0 && !searchFilter) {
      return <LoadingWrapper>Please specify a tag.</LoadingWrapper>;
    }

    const sortedTags = searchFilter
      ? tags
        .filter((tag) => tag.tag.toLowerCase().includes(searchFilter.toLowerCase()))
        .sort((a, b) => {
          const aIndex = a.tag.toLowerCase().indexOf(searchFilter.toLowerCase());
          const bIndex = b.tag.toLowerCase().indexOf(searchFilter.toLowerCase());
          return aIndex - bIndex;
        })
      : tags.sort((a, b) => {
        return (
          new Date(b.pushed_at ?? "").getTime() -
          new Date(a.pushed_at ?? "").getTime()
        );
      })

    const tagCards = sortedTags.map((tag: TagType, i: number) => {
      return (
        <TagItem
          key={i}
          onClick={() => {
            setSelectedTag(tag.tag);
          }}
        >
          <img src={tag_icon} />
          {tag.tag}
        </TagItem>
      );
    });

    if (searchFilter !== "" && !tags.some((tag) => tag.tag === searchFilter)) {
      tagCards.push(
        <TagItem
          onClick={() => {
            setSelectedTag(searchFilter);
          }}
        >
          <img src={addCircle} />
          {`Use tag \"${searchFilter}\"`}
        </TagItem>
      );
    }

    return tagCards;
  };

  return (
    <>
      <SearchBar
        setSearchFilter={setSearchFilter}
        disabled={error != null || isLoading}
        prompt={"Search tags..."}
      />
      <ExpandedWrapper>
        {renderTagList()}
      </ExpandedWrapper>
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
  color: #ffffff44;
`;
