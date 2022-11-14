import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Tooltip } from "@material-ui/core";
import Modal from "main/home/modals/Modal";
import { TwitterPicker } from "react-color";
import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import api from "shared/api";
import Color from "color";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";
import Helper from "components/form-components/Helper";
import { differenceBy } from "lodash";
import SearchSelector from "components/SearchSelector";

type Props = {
  onSave: ((values: any[]) => void) | ((values: any[]) => Promise<void>);
  release: ChartType;
};

const CanonicalName = ({ onSave, release }: Props) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [values, setValues] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [buttonStatus, setButtonStatus] = useState("");

  const onDelete = (index: number) => {
    setValues((prev) => {
      const newValues = [...prev];
      const removedTag = newValues.splice(index, 1);
      setAvailableTags((prevAt) => [...prevAt, ...removedTag]);
      return newValues;
    });
  };

  const handleSave = async () => {
    setButtonStatus("loading");

    try {
      await api.updateReleaseTags(
        "<token>",
        { tags: [...values.map((tag) => tag.name)] },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: release.namespace,
          release_name: release.name,
        }
      );
      await onSave(values);
      setButtonStatus("successful");
    } catch (error) {
      console.log(error);
      setCurrentError(
        "We couldn't link the tag to the release, please try again."
      );
      setButtonStatus("Couldn't link the tag to the release");
      return;
    } finally {
      setTimeout(() => {
        setButtonStatus("");
      }, 800);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    const hasAddedSomething = !!differenceBy(
      values,
      release.tags?.map((tagName: string) => ({ name: tagName })) || [],
      "name"
    ).length;

    const hasDeletedSomething = !!differenceBy(
      release.tags?.map((tagName: string) => ({ name: tagName })) || [],
      values,
      "name"
    ).length;

    return hasAddedSomething || hasDeletedSomething;
  }, [values, release]);

  return (
    <>
      <Flex>
        {values.map((val, index) => {
          return (
            <Tag color={val.color} key={index}>
              <Tooltip title={val.name}>
                <TagText>{val.name}</TagText>
              </Tooltip>
              <i className="material-icons" onClick={() => onDelete(index)}>
                cancel
              </i>
            </Tag>
          );
        })}
      </Flex>
      <SearchSelector
        options={availableTags}
        dropdownLabel="Select a tag"
        renderAddButton={() => (
          <AddTagButton
            onClick={(e) => {
              setOpenModal((prev) => !prev);
            }}
          >
            + Create a new tag
          </AddTagButton>
        )}
        filterBy="name"
        onSelect={(value) => {
          console.log(value);
          setAvailableTags((prev) =>
            prev.filter((prevVal) => prevVal.name !== value.name)
          );
          setValues((prev) => [...prev, value]);
        }}
        getOptionLabel={(option) => option.name}
        renderOptionIcon={(option) => <TagColorBox color={option.color} />}
      />
      <Flex
        style={{
          marginTop: "25px",
        }}
      >
        <SaveButton
          helper={hasUnsavedChanges ? "Unsaved changes" : ""}
          clearPosition
          statusPosition="right"
          text="Save changes"
          onClick={() => handleSave()}
          status={buttonStatus}
          disabled={!hasUnsavedChanges || buttonStatus === "loading"}
        ></SaveButton>
      </Flex>
      <Br />
    </>
  );
};

const AddTagButton = styled.div`
  color: #aaaabb;
  font-size: 13px;
  padding: 10px 0;
  z-index: 999;
  padding-left: 12px;
  cursor: pointer;
  :hover {
    color: white;
  }
`;

const Br = styled.div`
  width: 100%;
  height: 10px;
`;

export default CanonicalName;

const Flex = styled.div`
  display: flex;
  position: relative;
`;

const Tag = styled.div<{ color: string }>`
  display: inline-flex;
  color: ${(props) => Color(props.color).darken(0.4).string() || "inherit"};
  user-select: none;
  border: 1px solid ${(props) => Color(props.color).darken(0.4).string()};
  border-radius: 5px;
  padding: 4px 8px;
  position: relative;
  margin-bottom: 20px;
  text-align: center;
  align-items: center;
  font-size: 13px;
  background-color: ${(props) => props.color || "inherit"};

  max-width: 150px;
  min-width: 60px;

  :not(:last-child) {
    margin-right: 10px;
  }

  > .material-icons {
    font-size: 16px;
    :hover {
      cursor: pointer;
    }
  }
`;

const TagText = styled.span`
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const TagColorBox = styled.div`
  width: 15px;
  height: 15px;
  margin-right: 10px;
  border-radius: 0px;
  background-color: ${(props: { color: string }) => props.color};
`;
