import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Modal from "main/home/modals/Modal";
import EnvEditorModal from "main/home/modals/EnvEditorModal";

import upload from "assets/upload.svg";
import { MultiLineInput } from "components/porter-form/field-components/KeyValueArray";
import { dotenv_parse } from "shared/string_utils";
import { NewPopulatedEnvGroup, PopulatedEnvGroup } from "components/porter-form/types";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Tooltip from "components/porter/Tooltip";
export type KeyValueType = {
  key: string;
  value: string;
  hidden: boolean;
  locked: boolean;
  deleted: boolean;
};

type PropsType = {
  label?: string;
  values: KeyValueType[];
  setValues: (x: KeyValueType[]) => void;
  fileUpload?: boolean;
  syncedEnvGroups?: NewPopulatedEnvGroup[];
};

const EnvGroupArrayV2 = ({
  label,
  values,
  setValues,
  fileUpload,
  syncedEnvGroups
}: PropsType) => {
  const [showEditorModal, setShowEditorModal] = useState(false);

  useEffect(() => {
    if (!values) {
      setValues([]);
    }
  }, [values]);

  const isKeyOverriding = (key: string) => {
    if (!syncedEnvGroups) return false;
    return syncedEnvGroups.some(envGroup =>
      key in envGroup.variables || key in envGroup?.secret_variables
    );
  };

  const handleKeyChange = (values: KeyValueType[], i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const _values = [...values];
    _values[i].key = e.target.value;
    setValues(_values);
  };

  const handleValueChange = (values: KeyValueType[], i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const _values = [...values];
    _values[i].value = e.target.value;
    setValues(_values);
  };

  const readFile = (env: string) => {
    const envObj = dotenv_parse(env);
    const _values = [...values];

    for (const key in envObj) {
      let push = true;

      for (let i = 0; i < values.length; i++) {
        const existingKey = values[i]["key"];
        const isExistingKeyDeleted = values[i]["deleted"];
        if (key === existingKey && !isExistingKeyDeleted) {
          _values[i]["value"] = envObj[key];
          push = false;
        }
      }

      if (push) {
        _values.push({
          key,
          value: envObj[key],
          hidden: false,
          locked: false,
          deleted: false,
        });
      }
    }

    setValues(_values);
  };

  if (!values) {
    return null;
  }

  return (
    <>
      <StyledInputArray>
        <Label>{label}</Label>
        {!!values?.length &&
          values.map((entry, i) => {
            if (!entry.deleted) {
              return (
                <InputWrapper key={i}>
                  {entry.locked ? (
                    <Tooltip
                      content={"This key is part of a secret and cannot be edited"}
                      position={"bottom"}
                    >
                      <Input
                        placeholder="ex: key"
                        width="270px"
                        value={entry.key}
                        onChange={(e) => handleKeyChange(values, i, e)}
                        disabled
                        spellCheck={false}
                        override={isKeyOverriding(entry.key)}
                      />
                    </Tooltip>
                  ) : (
                    <Input
                      placeholder="ex: key"
                      width="270px"
                      value={entry.key}
                      onChange={(e) => handleKeyChange(values, i, e)}
                      spellCheck={false}
                      override={isKeyOverriding(entry.key)}
                    />
                  )}
                  <Spacer x={0.5} inline />
                  {entry.hidden ? (
                    entry.locked ? (
                      <Tooltip
                        content={"This value is part of a secret and cannot be edited"}
                        position={"bottom"}
                      >
                        <Input
                          placeholder="ex: value"
                          width="270px"
                          value={entry.value}
                          onChange={(e) => handleValueChange(values, i, e)}
                          disabled
                          type={"password"}
                          spellCheck={false}
                          override={isKeyOverriding(entry.key)}
                        />
                      </Tooltip>
                    ) : (
                      <Input
                        placeholder="ex: value"
                        width="270px"
                        value={entry.value}
                        onChange={(e) => handleValueChange(values, i, e)}
                        type={"password"}
                        spellCheck={false}
                        override={isKeyOverriding(entry.key)}
                      />
                    )
                  ) : (
                    <MultiLineInputer
                      placeholder="ex: value"
                      width="270px"
                      value={entry.value}
                      onChange={(e: any) => {
                        const _values = [...values];
                        _values[i].value = e.target.value;
                        setValues(_values);
                      }}
                      rows={entry.value?.split("\n").length}
                      spellCheck={false}
                      override={isKeyOverriding(entry.key)}
                    />
                  )}
                  {entry.hidden ? (
                    <HideButton
                      onClick={() => {
                        if (!entry.locked) {
                          const _values = [...values];
                          _values[i].hidden = !_values[i].hidden;
                          setValues(_values);
                        }
                      }}
                      disabled={entry.locked}
                    >
                      <i className="material-icons">lock_open</i>
                    </HideButton>
                  ) : (
                    <Tooltip
                      content={"Click to turn this variable into a secret"}
                      position={"bottom"}
                    >
                      <HideButton
                        onClick={() => {
                          if (!entry.locked) {
                            const values1 = [...values];
                            values1[i].hidden = !values1[i].hidden;
                            setValues(values1);
                          }
                        }}
                        disabled={entry.locked}
                      >
                        <i className="material-icons">lock</i>
                      </HideButton>
                    </Tooltip>
                  )}

                  <DeleteButton
                    onClick={() => {
                      setValues(values.filter((val, index) => index !== i));
                    }}
                  >
                    <i className="material-icons">cancel</i>
                  </DeleteButton>

                  {isKeyOverriding(entry.key) && (
                    <>
                      <Spacer x={1} inline />
                      <Text color={'#6b74d6'}>Key is overriding value in an environment group</Text>
                    </>
                  )}
                </InputWrapper>
              );
            }
            return null; // Add this line to handle the case when entry.deleted is true
          })}
        <InputWrapper>
          <AddRowButton
            onClick={() => {
              const _values = [
                ...values,
                {
                  key: "",
                  value: "",
                  hidden: false,
                  locked: false,
                  deleted: false,
                },
              ];
              setValues(_values);
            }}
          >
            <i className="material-icons">add</i> Add Row
          </AddRowButton>
          <Spacer x={0.5} inline />
          {fileUpload && (
            <UploadButton
              onClick={() => {
                setShowEditorModal(true);
              }}
            >
              <img src={upload} alt="Upload" /> Copy from File
            </UploadButton>
          )}
        </InputWrapper>
      </StyledInputArray>
      {showEditorModal && (
        <Modal
          onRequestClose={() => setShowEditorModal(false)}
          width="60%"
          height="650px"
        >
          <EnvEditorModal
            closeModal={() => setShowEditorModal(false)}
            setEnvVariables={(envFile: string) => readFile(envFile)}
          />
        </Modal>
      )}
    </>
  );
};

export default EnvGroupArrayV2;


const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 32px;
  border-radius: 3px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
  }

  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const UploadButton = styled(AddRowButton)`
  background: none;
  position: relative;
  border: 1px solid #ffffff55;
  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  > img {
    width: 14px;
    margin-left: 10px;
    margin-right: 12px;
  }
`;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-left: 8px;
  margin-top: -3px;
  justify-content: center;

  > i {
    font-size: 17px;
    color: #ffffff44;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    :hover {
      color: #ffffff88;
    }
  }
`;

const HideButton = styled(DeleteButton)`
  margin-top: -5px;
  > i {
    font-size: 19px;
    cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "default" : "pointer"};
    :hover {
      color: ${(props: { disabled: boolean }) =>
    props.disabled ? "#ffffff44" : "#ffffff88"};
    }
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;

`;

type InputProps = {
  disabled?: boolean;
  width: string;
  override?: boolean;
};

const Input = styled.input<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: ${(props) => (props.override ? '2px solid #6b74d6' : ' 1px solid #ffffff55')};
  border-radius: 3px;
  width: ${(props) => props.width ? props.width : "270px"};
  color: ${(props) => props.disabled ? "#ffffff44" : "white"};
  padding: 5px 10px;
  height: 35px;
`;
const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledInputArray = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;

export const MultiLineInputer = styled.textarea<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: ${(props) => (props.override ? '2px solid #6b74d6' : ' 1px solid #ffffff55')};
  border-radius: 3px;
  min-width: ${(props) => (props.width ? props.width : "270px")};
  max-width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  padding: 8px 10px 5px 10px;
  min-height: 35px;
  max-height: 100px;
  white-space: nowrap;

  ::-webkit-scrollbar {
    width: 8px;
    :horizontal {
      height: 8px;
    }
  }

  ::-webkit-scrollbar-corner {
    width: 10px;
    background: #ffffff11;
    color: white;
  }

  ::-webkit-scrollbar-track {
    width: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background-color: darkgrey;
    outline: 1px solid slategrey;
  }
`;
