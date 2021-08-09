import React from "react";
import {
  GetFinalVariablesFunction,
  InputField,
  KeyValueArrayField,
  KeyValueArrayFieldState,
} from "../types";
import sliders from "../../../assets/sliders.svg";
import upload from "../../../assets/upload.svg";
import styled from "styled-components";
import useFormField from "../hooks/useFormField";
import Modal from "../../../main/home/modals/Modal";
import LoadEnvGroupModal from "../../../main/home/modals/LoadEnvGroupModal";
import EnvEditorModal from "../../../main/home/modals/EnvEditorModal";

interface Props extends KeyValueArrayField {
  id: string;
}

const KeyValueArray: React.FC<Props> = (props) => {
  const { state, setState, variables } = useFormField<KeyValueArrayFieldState>(
    props.id,
    {
      initState: {
        values:
          props.value && props.value[0]
            ? (Object.entries(props.value[0])?.map(([k, v]) => {
                return { key: k, value: v };
              }) as any[])
            : [],
        showEnvModal: false,
        showEditorModal: false,
      },
    }
  );

  if (state == undefined) return <></>;

  const parseEnv = (src: any, options: any) => {
    const debug = Boolean(options && options.debug);
    const obj = {} as Record<string, string>;
    const NEWLINE = "\n";
    const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;
    const RE_NEWLINES = /\\n/g;
    const NEWLINES_MATCH = /\n|\r|\r\n/;

    // convert Buffers before splitting into lines and processing
    src
      .toString()
      .split(NEWLINES_MATCH)
      .forEach(function (line: any, idx: any) {
        // matching "KEY' and 'VAL' in 'KEY=VAL'
        const keyValueArr = line.match(RE_INI_KEY_VAL);
        // matched?
        if (keyValueArr != null) {
          const key = keyValueArr[1];
          // default undefined or missing values to empty string
          let val = keyValueArr[2] || "";
          const end = val.length - 1;
          const isDoubleQuoted = val[0] === '"' && val[end] === '"';
          const isSingleQuoted = val[0] === "'" && val[end] === "'";

          // if single or double quoted, remove quotes
          if (isSingleQuoted || isDoubleQuoted) {
            val = val.substring(1, end);

            // if double quoted, expand newlines
            if (isDoubleQuoted) {
              val = val.replace(RE_NEWLINES, NEWLINE);
            }
          } else {
            // remove surrounding whitespace
            val = val.trim();
          }

          obj[key] = val;
        } else if (debug) {
          console.log(
            `did not match key and value when parsing line ${idx + 1}: ${line}`
          );
        }
      });

    return obj;
  };

  const readFile = (env: string) => {
    let envObj = parseEnv(env, null);
    let push = true;

    for (let key in envObj) {
      for (var i = 0; i < state.values.length; i++) {
        let existingKey = state.values[i]["key"];
        if (key === existingKey) {
          state.values[i]["value"] = envObj[key];
          push = false;
        }
      }

      if (push) {
        setState((prev) => {
          return {
            values: [...prev.values, { key, value: envObj[key] }],
          };
        });
      }
    }
  };

  const renderEditorModal = () => {
    if (state.showEditorModal) {
      return (
        <Modal
          onRequestClose={() =>
            setState(() => {
              return { showEditorModal: false };
            })
          }
          width="60%"
          height="80%"
        >
          <EnvEditorModal
            closeModal={() =>
              setState(() => {
                return { showEditorModal: false };
              })
            }
            setEnvVariables={(envFile: string) => readFile(envFile)}
          />
        </Modal>
      );
    }
  };

  const getProcessedValues = (
    objectArray: { key: string; value: string }[]
  ): any => {
    let obj = {} as any;
    objectArray?.forEach(({ key, value }) => {
      obj[key] = value;
    });
    return obj;
  };

  const renderEnvModal = () => {
    if (state.showEnvModal) {
      return (
        <Modal
          onRequestClose={() =>
            setState(() => {
              return { showEnvModal: false };
            })
          }
          width="765px"
          height="542px"
        >
          <LoadEnvGroupModal
            existingValues={getProcessedValues(state.values)}
            namespace={variables.namespace}
            clusterId={variables.clusterId}
            closeModal={() =>
              setState(() => {
                return {
                  showEnvModal: false,
                };
              })
            }
            setValues={(values) => {
              setState((prev) => {
                return {
                  // might be broken
                  values: [
                    ...prev.values,
                    ...Object.entries(values)?.map(([k, v]) => {
                      return {
                        key: k,
                        value: v,
                      };
                    }),
                  ],
                };
              });
            }}
          />
        </Modal>
      );
    }
  };

  const renderDeleteButton = (i: number) => {
    if (!props.isReadOnly) {
      return (
        <DeleteButton
          onClick={() => {
            state.values.splice(i, 1);
            setState((prev) => {
              return {
                values: prev.values
                  .slice(0, i + 1)
                  .concat(prev.values.slice(i + 1, prev.values.length)),
              };
            });
          }}
        >
          <i className="material-icons">cancel</i>
        </DeleteButton>
      );
    }
  };

  const renderHiddenOption = (hidden: boolean, i: number) => {
    if (props.secretOption && hidden) {
      return (
        <HideButton>
          <i className="material-icons">lock</i>
        </HideButton>
      );
    }
  };

  const renderInputList = () => {
    return (
      <>
        {state.values?.map((entry: any, i: number) => {
          // Preprocess non-string env values set via raw Helm values
          let { value } = entry;
          if (typeof value === "object") {
            value = JSON.stringify(value);
          } else if (typeof value === "number" || typeof value === "boolean") {
            value = value.toString();
          }

          return (
            <InputWrapper key={i}>
              <Input
                placeholder="ex: key"
                width="270px"
                value={entry.key}
                onChange={(e: any) => {
                  e.persist();
                  setState((prev) => {
                    return {
                      values: prev.values?.map((t, j) => {
                        if (j == i) {
                          return {
                            ...t,
                            key: e.target.value,
                          };
                        }
                        return t;
                      }),
                    };
                  });
                }}
                disabled={props.isReadOnly || value.includes("PORTERSECRET")}
                spellCheck={false}
              />
              <Spacer />
              <Input
                placeholder="ex: value"
                width="270px"
                value={value}
                onChange={(e: any) => {
                  e.persist();
                  setState((prev) => {
                    return {
                      values: prev.values?.map((t, j) => {
                        if (j == i) {
                          return {
                            ...t,
                            value: e.target.value,
                          };
                        }
                        return t;
                      }),
                    };
                  });
                }}
                disabled={props.isReadOnly || value.includes("PORTERSECRET")}
                type={value.includes("PORTERSECRET") ? "password" : "text"}
                spellCheck={false}
              />
              {renderDeleteButton(i)}
              {renderHiddenOption(value.includes("PORTERSECRET"), i)}
            </InputWrapper>
          );
        })}
      </>
    );
  };

  return (
    <>
      <StyledInputArray>
        <Label>{props.label}</Label>
        {state.values.length === 0 ? <></> : renderInputList()}
        {props.isReadOnly ? (
          <></>
        ) : (
          <InputWrapper>
            <AddRowButton
              onClick={() => {
                setState((prev) => {
                  return {
                    values: [...prev.values, { key: "", value: "" }],
                  };
                });
              }}
            >
              <i className="material-icons">add</i> Add Row
            </AddRowButton>
            <Spacer />
            {variables.namespace && props.envLoader && (
              <LoadButton
                onClick={() =>
                  setState((prev) => {
                    return {
                      showEnvModal: !prev.showEnvModal,
                    };
                  })
                }
              >
                <img src={sliders} /> Load from Env Group
              </LoadButton>
            )}
            {props.fileUpload && (
              <UploadButton
                onClick={() => {
                  setState((prev) => {
                    return {
                      showEditorModal: true,
                    };
                  });
                }}
              >
                <img src={upload} /> Copy from File
              </UploadButton>
            )}
          </InputWrapper>
        )}
      </StyledInputArray>
      {renderEnvModal()}
      {renderEditorModal()}
    </>
  );
};

export const getFinalVariablesForKeyValueArray: GetFinalVariablesFunction = (
  vars,
  props: KeyValueArrayField,
  state: KeyValueArrayFieldState
) => {
  if (!state) {
    return {
      [props.variable]: props.value ? props.value[0] : [],
    };
  }

  let obj = {} as any;
  const rg = /(?:^|[^\\])(\\n)/g;
  const fixNewlines = (s: string) => {
    while (rg.test(s)) {
      s = s.replace(rg, (str) => {
        if (str.length == 2) return "\n";
        if (str[0] != "\\") return str[0] + "\n";
        return "\\n";
      });
    }
    return s;
  };
  const isNumber = (s: string) => {
    return !isNaN(!s ? NaN : Number(String(s).trim()));
  };
  state.values.forEach((entry: any, i: number) => {
    if (isNumber(entry.value)) {
      obj[entry.key] = entry.value;
    } else {
      obj[entry.key] = fixNewlines(entry.value);
    }
  });
  return {
    [props.variable]: obj,
  };
};

export default KeyValueArray;

const Spacer = styled.div`
  width: 10px;
  height: 20px;
`;

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

const LoadButton = styled(AddRowButton)`
  background: none;
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

const UploadButton = styled(AddRowButton)`
  background: none;
  position: relative;
  margin-left: 10px;
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
    cursor: default;
    :hover {
      color: #ffffff44;
    }
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;

const Input = styled.input`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { disabled?: boolean; width: string }) =>
    props.width ? props.width : "270px"};
  color: ${(props: { disabled?: boolean; width: string }) =>
    props.disabled ? "#ffffff44" : "white"};
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
