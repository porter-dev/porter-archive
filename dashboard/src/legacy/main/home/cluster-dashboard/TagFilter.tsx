import React, { useContext, useEffect, useState } from "react";
import tag from "legacy/assets/tag.svg";
import RadioFilter from "legacy/components/RadioFilter";
import api from "legacy/shared/api";
import styled from "styled-components";

import { Context } from "shared/Context";

const TagFilter = ({ onSelect }: { onSelect: (tag: any) => void }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [selectedTag, setSelectedTag] = useState("none");
  const [tags, setTags] = useState([]);

  useEffect(() => {
    let isSubscribed = true;
    api
      .getTagsByProjectId("<token>", {}, { project_id: currentProject.id })
      .then((res) => {
        const newTags = res.data;

        setTags(newTags);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, currentCluster]);

  useEffect(() => {
    const currentTag = tags.find((tag) => tag.name === selectedTag);
    onSelect(currentTag);
  }, [selectedTag]);

  return (
    <RadioFilter
      selected={selectedTag}
      options={[{ label: "All", value: "none" }].concat(
        tags.map((tag) => ({
          value: tag.name,
          label: tag.name,
        }))
      )}
      setSelected={(newVal: any) => {
        setSelectedTag(newVal);
      }}
      name="Tag"
      icon={tag}
    />
  );
};

export default TagFilter;

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledTagSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
`;
