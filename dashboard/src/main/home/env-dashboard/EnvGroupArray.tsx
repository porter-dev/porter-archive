import React, { useEffect, useState } from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import EnvEditorModal from "main/home/modals/EnvEditorModal";
import Modal from "main/home/modals/Modal";

import { dotenv_parse } from "shared/string_utils";
import upload from "assets/upload.svg";

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
  disabled?: boolean;
  fileUpload?: boolean;
  secretOption?: boolean;
  setButtonDisabled?: (x: boolean) => void;
};

const EnvGroupArray = ({
  label,
  values,
  setValues = () => {},
  disabled,
  fileUpload,
  secretOption,
  setButtonDisabled,
}: PropsType): React.ReactElement => {
  const [showEditorModal, setShowEditorModal] = useState(false);
  const blankValues = (): void => {
    const isAnyEnvVariableBlank = values.some(
      (envVar) => !envVar.key.trim() || !envVar.value.trim()
    );
    if (setButtonDisabled) {
      setButtonDisabled(isAnyEnvVariableBlank);
    }
  };
  const blankValue = (key: string): boolean => {
    if (key === "" && setButtonDisabled) {
      return true;
    }
    return false;
  };

  const incorrectRegex = (key: string) => {
    const pattern = /^[a-zA-Z0-9._-]+$/;
    if (setButtonDisabled) {
      setButtonDisabled(!pattern.test(key));
      blankValues();
    }
    if (key) {
      // The test() method tests for a match in a string
      return !pattern.test(key);
    }
    return false;
  };
  useEffect(() => {
    if (!values) {
      setValues([]);
    }
  }, [values]);

  const readFile = (env: string) => {
    const envObj = dotenv_parse(env);
    const _values = [...values];

    for (const key in envObj) {
      let push = true;

      for (let i = 0; i < values.length; i++) {
        const existingKey = values[i].key;
        const isExistingKeyDeleted = values[i].deleted;
        if (key === existingKey && !isExistingKeyDeleted) {
          _values[i].value = envObj[key];
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
      <Label>{label}</Label>
      {!!values?.length &&
        values.map((entry: KeyValueType, i: number) => {
          if (!entry.deleted) {
            return (
              <InputWrapper key={i}>
                <Input
                  placeholder="ex: key"
                  width="270px"
                  value={entry.key}
                  onChange={(e: any) => {
                    const _values = [...values];
                    _values[i].key = e.target.value;
                    setValues(_values);
                  }}
                  disabled={disabled || entry.locked}
                  spellCheck={false}
                  override={incorrectRegex(entry.key)}
                />
                <Spacer inline width="10px" />

                {entry.hidden ? (
                  <Input
                    placeholder="ex: value"
                    value={entry.value}
                    flex
                    onChange={(e: any) => {
                      const _values = [...values];
                      _values[i].value = e.target.value;
                      setValues(_values);
                    }}
                    disabled={disabled || entry.locked}
                    type={entry.hidden ? "password" : "text"}
                    spellCheck={false}
                    override={incorrectRegex(entry.key)}
                  />
                ) : (
                  <MultiLineInputer
                    placeholder={
                      blankValue(entry.value)
                        ? "value cannot be blank"
                        : "ex: value"
                    }
                    width="270px"
                    value={entry.value}
                    onChange={(e: any) => {
                      const _values = [...values];
                      _values[i].value = e.target.value;
                      setValues(_values);
                    }}
                    rows={entry.value?.split("\n").length}
                    disabled={disabled || entry.locked}
                    spellCheck={false}
                    override={blankValue(entry.value)}
                  />
                )}
                {secretOption && (
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
                    {entry.hidden ? (
                      <i className="material-icons">lock</i>
                    ) : (
                      <i className="material-icons">lock_open</i>
                    )}
                  </HideButton>
                )}

                {!disabled && (
                  <DeleteButton
                    onClick={() => {
                      setValues(values.filter((val, index) => index !== i));
                    }}
                  >
                    <i className="material-icons">cancel</i>
                  </DeleteButton>
                )}
              </InputWrapper>
            );
          }
        })}
      {!disabled && (
        <>
          {values.length > 0 && <Spacer y={0.5} />}
          <InputWrapper>
            <Button
              alt
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
              <I className="material-icons">add</I> Add row
            </Button>
            <Spacer inline x={0.5} />
            {fileUpload && (
              <Button
                alt
                onClick={() => {
                  setShowEditorModal(true);
                }}
              >
                <Image size={16} src={upload} />
                <Spacer inline x={0.5} />
                Copy from file
              </Button>
            )}
          </InputWrapper>
        </>
      )}
      {showEditorModal && (
        <Modal
          onRequestClose={() => {
            setShowEditorModal(false);
          }}
          width="60%"
          height="650px"
        >
          <EnvEditorModal
            closeModal={() => {
              setShowEditorModal(false);
            }}
            setEnvVariables={(envFile: string) => {
              readFile(envFile);
            }}
          />
        </Modal>
      )}
    </>
  );
};

const I = styled.i`
  font-size: 16px;
  margin-right: 7px;
`;

export default EnvGroupArray;

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
  margin-bottom: 5px;
`;

const Input = styled.input<{ flex?: boolean; override?: boolean }>`
  outline: none;
  display: ${(props) => (props.flex ? "flex" : "block")};
  ${(props) => props.flex && "flex: 1;"}
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border: ${(props) =>
    props.override ? "2px solid #f4cb42" : " 1px solid #494b4f"};
  border-radius: 5px;
  width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "#fefefe")};
  padding: 5px 10px;
  height: 35px;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

export const MultiLineInputer = styled.textarea<InputProps>`
  outline: none;
  border: none;
  display: flex;
  flex: 1;
  margin-bottom: 5px;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border: ${(props) =>
    props.override ? "2px solid #f4cb42" : " 1px solid #494b4f"};
  border-radius: 5px;
  color: ${(props) => (props.disabled ? "#ffffff44" : "#fefefe")};
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
