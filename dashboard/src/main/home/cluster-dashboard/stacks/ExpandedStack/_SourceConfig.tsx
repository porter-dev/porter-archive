import SaveButton from "components/SaveButton";
import React, { useContext, useReducer, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import { FullStackRevision, SourceConfig } from "../types";
import SourceEditorDocker from "./components/SourceEditorDocker";

const _SourceConfig = ({
  namespace,
  revision,
  readOnly,
  onSourceConfigUpdate,
}: {
  namespace: string;
  revision: FullStackRevision;
  readOnly: boolean;
  onSourceConfigUpdate: () => void;
}) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [sourceConfigArrayCopy, setSourceConfigArrayCopy] = useState<
    SourceConfig[]
  >(() => revision.source_configs);
  const [buttonStatus, setButtonStatus] = useState("");

  const handleChange = (sourceConfig: SourceConfig) => {
    const newSourceConfigArray = [...sourceConfigArrayCopy];
    const index = newSourceConfigArray.findIndex(
      (sc) => sc.id === sourceConfig.id
    );
    newSourceConfigArray[index] = sourceConfig;
    setSourceConfigArrayCopy(newSourceConfigArray);
  };

  const handleSave = () => {
    setButtonStatus("loading");
    api
      .updateStackSourceConfig(
        "<token>",
        {
          source_configs: sourceConfigArrayCopy,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: namespace,
          stack_id: revision.stack_id,
        }
      )
      .then(() => {
        setButtonStatus("successful");
        onSourceConfigUpdate();
      })
      .catch((err) => {
        setButtonStatus("Something went wrong");
        setCurrentError(err);
      });
  };

  return (
    <SourceConfigStyles.Wrapper>
      {revision.source_configs.map((sourceConfig) => {
        return (
          <SourceConfigItem
            sourceConfig={sourceConfig}
            key={sourceConfig.id}
            handleChange={handleChange}
            disabled={readOnly || buttonStatus === "loading"}
          />
        );
      })}
      {readOnly ? null : (
        <SourceConfigStyles.SaveButtonRow>
          <SourceConfigStyles.SaveButton
            onClick={handleSave}
            text="Save"
            clearPosition={true}
            makeFlush={true}
            status={buttonStatus}
            statusPosition="left"
          />
        </SourceConfigStyles.SaveButtonRow>
      )}
    </SourceConfigStyles.Wrapper>
  );
};

export default _SourceConfig;

const SourceConfigStyles = {
  Wrapper: styled.div`
    margin-top: 30px;
    position: relative;
  `,
  ItemContainer: styled.div`
    background: #ffffff11;
    border-radius: 8px;
    padding: 30px 35px 35px;
  `,
  ItemTitle: styled.div`
    font-size: 16px;
    font-weight: 500;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    > span {
      overflow-x: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
  TooltipItem: styled.div`
    font-size: 14px;
  `,
  SaveButtonRow: styled.div`
    margin-top: 15px;
    display: flex;
    justify-content: flex-end;
  `,
  SaveButton: styled(SaveButton)`
    z-index: unset;
  `,
};

const SourceConfigItem = ({
  sourceConfig,
  handleChange,
  disabled,
}: {
  sourceConfig: SourceConfig;
  handleChange: (sourceConfig: SourceConfig) => void;
  disabled: boolean;
}) => {
  const [editNameMode, toggleEditNameMode] = useReducer((prev) => !prev, false);
  const prevName = useRef(sourceConfig.name);
  const [name, setName] = useState(sourceConfig.name);

  const handleNameChange = (newName: string) => {
    setName(newName);
    handleChange({ ...sourceConfig, name: newName });
  };

  const handleNameChangeCancel = () => {
    setName(prevName.current);
    handleChange({ ...sourceConfig, name: prevName.current });
    toggleEditNameMode();
  };

  return (
    <SourceConfigStyles.ItemContainer>
      {editNameMode && !disabled ? (
        <>
          <SourceConfigStyles.ItemTitle>
            <PlainTextInput
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              type="text"
              disabled={disabled}
            />
            <EditButton onClick={handleNameChangeCancel}>
              <i className="material-icons-outlined">close</i>
            </EditButton>
          </SourceConfigStyles.ItemTitle>
        </>
      ) : (
        <SourceConfigStyles.ItemTitle>
          <span>{name}</span>

          {sourceConfig.stable_source_config_id && (
            <EditButton
              onClick={toggleEditNameMode}
              disabled={!sourceConfig.stable_source_config_id}
            >
              <i className="material-icons-outlined">edit</i>
            </EditButton>
          )}
        </SourceConfigStyles.ItemTitle>
      )}

      <SourceEditorDocker
        sourceConfig={sourceConfig}
        onChange={handleChange}
        readOnly={disabled}
      />
    </SourceConfigStyles.ItemContainer>
  );
};

const EditButton = styled.button`
  outline: none;
  cursor: pointer;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.333);
  background: rgba(255, 255, 255, 0.067);
  height: 35px;
  width: 35px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  > i {
    font-size: 20px;
  }
`;

const PlainTextInput = styled.input`
  outline: none;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  font-size: 13px;
  background: #ffffff11;
  width: 100%;
  color: white;
  padding: 5px 10px;
  height: 35px;
`;
