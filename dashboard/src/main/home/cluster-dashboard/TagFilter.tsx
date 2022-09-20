import Selector from "components/Selector";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";

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
    <StyledTagSelector>
      <Label>
        <i className="material-icons">tag</i>
        Tag
      </Label>
      <Selector
        activeValue={selectedTag}
        options={[{ label: "No tag selected", value: "none" }].concat(
          tags.map((tag) => ({
            value: tag.name,
            label: tag.name,
          }))
        )}
        setActiveValue={(newVal) => setSelectedTag(newVal)}
        width={"150px"}
        dropdownWidth="fit-content"
      />
    </StyledTagSelector>
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
