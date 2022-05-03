import React, { useContext, useEffect, useState } from "react";
import { Autocomplete as MaterialAutocomplete } from "@material-ui/lab";
import styled from "styled-components";
import { Tooltip } from "@material-ui/core";
import Modal from "main/home/modals/Modal";
import { TwitterPicker } from "react-color";
import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";

type Props = {
  options: any[];
  defaultValue: any[];
  onChange: (values: any[]) => void;
  release: ChartType;
};

const TagSelector = ({ options, defaultValue, onChange, release }: Props) => {
  const [values, setValues] = useState(() => defaultValue || []);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    onChange(values);
  }, [values]);

  const onDelete = (index: number) => {
    setValues((prev) => {
      const newValues = [...prev];
      newValues.splice(index, 1);
      return newValues;
    });
  };

  return (
    <>
      {openModal ? (
        <CreateTagModal
          onSave={(newTag) => setValues((prev) => [...prev, newTag])}
          onClose={() => setOpenModal(false)}
          release={release}
        />
      ) : null}
      <Flex>
        <MaterialAutocomplete
          fullWidth
          filterSelectedOptions
          options={options.filter(
            (option) => !values.find((v) => v.name === option.name)
          )}
          onChange={(_, value) => {
            setValues((prev) => [...prev, value]);
          }}
          getOptionLabel={(option) => option.name}
          getOptionSelected={(option, value) => option.name === value}
          renderInput={(params) => {
            console.log(params);
            return (
              <>
                <InputWrapper ref={params.InputProps.ref}>
                  <Input {...params.inputProps} />
                </InputWrapper>
                {params.InputProps.startAdornment}
              </>
            );
          }}
        ></MaterialAutocomplete>
        <Tooltip title="Create a new tag">
          <AddButton
            className="material-icons-outlined"
            onClick={() => setOpenModal((prev) => !prev)}
          >
            add
          </AddButton>
        </Tooltip>
      </Flex>
      {values.map((val, index) => {
        return (
          <Tag color={val.color} key={index}>
            <Tooltip title={val.name}>
              <TagText>{val.name}</TagText>
            </Tooltip>
            <i className="material-icons" onClick={() => onDelete(index)}>
              delete
            </i>
          </Tag>
        );
      })}
    </>
  );
};

const CreateTagModal = ({
  onSave,
  onClose,
  release,
}: {
  onSave: (tag: any) => void;
  onClose: () => void;
  release: ChartType;
}) => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  const [color, setColor] = useState("#ffffff");
  const [name, setName] = useState("some-random-tag");

  const [buttonStatus, setButtonStatus] = useState("");

  const createTag = async () => {
    setButtonStatus("loading");
    try {
      await api.createTag(
        "<token>",
        { name, color },
        {
          project_id: currentProject.id,
        }
      );
    } catch (error) {
      setCurrentError(error);
      setButtonStatus("Couldn't create the tag");
      return;
    }

    try {
      await api.updateReleaseTags(
        "<token>",
        { tags: [...(release.tags || []), name] },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: release.namespace,
          release_name: release.name,
        }
      );
      setButtonStatus("successful");
      onSave({ name, color });
      onClose();
    } catch (error) {
      console.log(error);
      setCurrentError(
        "We couldn't link the tag to the release, please link it manually from the settings tab."
      );
      setButtonStatus("Couldn't link the tag to the release");
      return;
    }
  };

  return (
    <Modal title="Create a new tag" onRequestClose={onClose} height="auto">
      <InputRow
        type="text"
        label="Tag name"
        value={name}
        setValue={(val) => setName(val as string)}
        isRequired
        width="300px"
      ></InputRow>
      <Label>Tag color</Label>
      <TwitterPicker
        triangle="hide"
        color={color}
        onChange={(newColor) => setColor(newColor.hex)}
      ></TwitterPicker>

      <Label style={{ marginTop: "15px" }}>Result</Label>
      <Tag color={color} style={{ maxWidth: "none", marginTop: "0px" }}>
        <TagText>{name}</TagText>
      </Tag>
      <SaveButton
        onClick={() => createTag()}
        text={"Create Tag"}
        disabled={!name.length || buttonStatus === "loading"}
      ></SaveButton>
    </Modal>
  );
};

export default TagSelector;

const Flex = styled.div`
  display: flex;
`;

const AddButton = styled.div`
  border-radius: 50%;
  border: 1px solid #ffffff11;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  background: #ffffff11;
  color: #ffffff88;
  :hover {
    background: #ffffff22;
    color: #ffffff;
    cursor: pointer;
  }
`;

const Tag = styled.div<{ color: string }>`
  display: inline-flex;
  color: ${(props) => props.color || "inherit"};
  user-select: none;
  border: 1px solid black;
  border-radius: 15px;
  padding: 5px 10px;
  text-align: center;
  align-items: center;
  font-size: 14px;
  background-color: ${(props) => props.color || "inherit"};
  margin-top: 15px;
  margin-bottom: 5px;

  max-width: 150px;
  min-height: 30px;
  min-width: 60px;

  :not(:last-child) {
    margin-right: 10px;
  }

  > .material-icons {
    font-size: 20px;
    margin-left: 5px;
    filter: invert(1);
    :hover {
      cursor: pointer;
    }
  }
`;

const TagText = styled.span`
  mix-blend-mode: difference;

  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const InputWrapper = styled.div`
  display: flex;
  margin-bottom: -1px;
  align-items: center;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  background: #ffffff11;
`;

const Input = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  color: #ffffff;
  padding: 5px 10px;
  min-height: 35px;
  max-height: 45px;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;
