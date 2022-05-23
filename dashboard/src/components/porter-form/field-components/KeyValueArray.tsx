import React, { useContext, useEffect, useState } from "react";
import {
  GetFinalVariablesFunction,
  GetMetadataFunction,
  KeyValueArrayField,
  KeyValueArrayFieldState,
  PopulatedEnvGroup,
} from "../types";
import sliders from "../../../assets/sliders.svg";
import upload from "../../../assets/upload.svg";
import styled, { keyframes } from "styled-components";
import useFormField from "../hooks/useFormField";
import Modal from "../../../main/home/modals/Modal";
import LoadEnvGroupModal from "../../../main/home/modals/LoadEnvGroupModal";
import EnvEditorModal from "../../../main/home/modals/EnvEditorModal";
import { hasSetValue } from "../utils";
import _, { isObject, differenceBy, omit } from "lodash";
import Helper from "components/form-components/Helper";
import Heading from "components/form-components/Heading";
import Loading from "components/Loading";
import api from "shared/api";
import { Context } from "shared/Context";
import { dotenv_parse } from "shared/string_utils";

interface Props extends KeyValueArrayField {
  id: string;
}

const KeyValueArray: React.FC<Props> = (props) => {
  const { state, setState, variables } = useFormField<KeyValueArrayFieldState>(
    props.id,
    {
      initState: () => {
        let values = props.value[0];
        const normalValues = Object.entries(values?.normal || {});
        values = omit(values, ["normal", "synced", "build"]);
        return {
          values: hasSetValue(props)
            ? ([...Object.entries(values), ...normalValues]?.map(([k, v]) => {
                return { key: k, value: v };
              }) as any[])
            : [],
          showEnvModal: false,
          showEditorModal: false,
          synced_env_groups: props.settings?.options?.enable_synced_env_groups
            ? null
            : [],
        };
      },
    }
  );

  const { currentProject } = useContext(Context);

  // If the variable includes normal it means that the form corresponds to an old job template version
  // The "normal" keyword doesn't exist for applications as well as the enable_synced_env_groups setting.
  // This is why we have to check if the form corresponds to a job or not.
  const enableSyncedEnvGroups = props.variable.includes("normal")
    ? !!props.settings?.options?.enable_synced_env_groups
    : true;

  useEffect(() => {
    if (hasSetValue(props) && !Array.isArray(state?.synced_env_groups)) {
      const values = props.value[0];
      // console.log(values);
      const envGroups = values?.synced || [];
      const promises = Promise.all(
        envGroups.map(async (envGroup: any) => {
          const res = await api.getEnvGroup(
            "<token>",
            {},
            {
              id: currentProject.id,
              cluster_id: variables.clusterId,
              namespace: variables.namespace,
              name: envGroup?.name,
              version: envGroup.version,
            }
          );
          return res.data;
        })
      );

      promises.then((populatedEnvGroups) => {
        setState(() => ({
          synced_env_groups: Array.isArray(populatedEnvGroups)
            ? populatedEnvGroups
            : [],
        }));
      });
    }
  }, [
    props.value[0],
    variables?.clusterId,
    variables?.namespace,
    currentProject?.id,
  ]);

  if (state == undefined) return <></>;

  if (!Array.isArray(state.synced_env_groups) && enableSyncedEnvGroups) {
    return <Loading />;
  }

  const parseEnv = (src: any, options: any) => {
    return dotenv_parse(src);
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
          width="800px"
          height="542px"
        >
          <LoadEnvGroupModal
            existingValues={getProcessedValues(state.values)}
            enableSyncedEnvGroups={enableSyncedEnvGroups}
            syncedEnvGroups={state.synced_env_groups}
            namespace={variables.namespace}
            clusterId={variables.clusterId}
            closeModal={() =>
              setState(() => {
                return {
                  showEnvModal: false,
                };
              })
            }
            setSyncedEnvGroups={(value) => {
              setState((prev) => {
                return {
                  synced_env_groups: [...(prev.synced_env_groups || []), value],
                };
              });
            }}
            setValues={(values) => {
              setState((prev) => {
                // Transform array to object similar on what we receive from setValues
                const prevValues = prev.values.reduce((acc, currentValue) => {
                  acc[currentValue.key] = currentValue.value;
                  return acc;
                }, {} as Record<string, string>);

                // Deconstruct the two records/objects inside one to merge their values (this will override the old duped vars too)
                // and convert the new object back to an array usable for the component
                const newValues = Object.entries({
                  ...prevValues,
                  ...values,
                })?.map(([k, v]) => {
                  return {
                    key: k,
                    value: v,
                  };
                });

                return {
                  values: [...newValues],
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

  const checkOverridedKey = (key: string) => {
    const env_group = state.synced_env_groups.find(
      (env) => env?.variables && env?.variables[key]
    );

    if (env_group) {
      return (
        <Wrapper>
          <Helper color="#f5cb42" style={{ marginLeft: "10px" }}>
            Overridden by the env group "{env_group?.name}"
          </Helper>
        </Wrapper>
      );
    }

    return null;
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
              <KeyInput
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
                borderColor={
                  checkOverridedKey(entry.key) ? "#f5cb42" : undefined
                }
              />
              <Spacer />
              {value?.includes("PORTERSECRET") ? (
                <KeyInput
                  placeholder="ex: value"
                  width="270px"
                  disabled
                  type={"password"}
                  spellCheck={false}
                  value={value}
                />
              ) : (
                <MultiLineInput
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
                  disabled={props.isReadOnly}
                  spellCheck={false}
                  rows={value?.split("\n").length}
                />
              )}
              {renderDeleteButton(i)}
              {renderHiddenOption(value.includes("PORTERSECRET"), i)}
              {checkOverridedKey(entry.key)}
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
        {enableSyncedEnvGroups && !!state.synced_env_groups?.length && (
          <>
            <Heading>Synced Environment Groups</Heading>
            <Br />
            {state.synced_env_groups?.map((envGroup: any) => {
              return (
                <ExpandableEnvGroup
                  key={envGroup?.name}
                  envGroup={envGroup}
                  onDelete={() => {
                    setState((prev) => {
                      const synced = prev.synced_env_groups?.filter(
                        (env) => env.name !== envGroup.name
                      );
                      return {
                        ...prev,
                        synced_env_groups: synced,
                      };
                    });
                  }}
                />
              );
            })}
          </>
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
      [props.variable]: hasSetValue(props) ? props.value[0] : [],
    };
  }

  const isNumber = (s: string) => {
    return !isNaN(!s ? NaN : Number(String(s).trim()));
  };

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

  if (props.variable.includes("env")) {
    let obj = {
      normal: {},
    } as any;

    state.values.forEach((entry: any, i: number) => {
      if (isNumber(entry.value)) {
        obj.normal[entry.key] = entry.value;
      } else {
        obj.normal[entry.key] = fixNewlines(entry.value);
      }
    });

    if (Array.isArray(props.value) && props.value[0]?.build) {
      obj.build = props.value[0].build;
    }

    if (state.synced_env_groups?.length) {
      obj.synced = state.synced_env_groups.map((envGroup) => ({
        name: envGroup?.name,
        version: envGroup?.version,
        keys: Object.entries(envGroup?.variables || {}).map(([key, val]) => ({
          name: key,
          secret: val.includes("PORTERSECRET"),
        })),
      }));
    }

    const variableContent = props.variable.split(".");
    let variable = props.variable;

    if (variable.includes("normal")) {
      variable = `${variableContent[0]}.${variableContent[1]}`;
    }

    return {
      [variable]: obj,
    };
  } else {
    let obj = {} as any;

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
  }
};

type KeyValueArrayMetadata = {
  [variable: string]: {
    added: { name: string }[];
    deleted: { name: string }[];
  };
};

export const getMetadata: GetMetadataFunction<KeyValueArrayMetadata> = (
  vars,
  props: KeyValueArrayField,
  state: KeyValueArrayFieldState
) => {
  // We don't need any metadata for other key-value-array fields yet so we return null for that variable
  if (!state || !props?.variable?.includes("env")) {
    return {
      [props.variable]: null,
    };
  }

  const originalSyncedEnvGroups: { name: string }[] =
    props.value[0]?.synced || [];
  const currSynced = state?.synced_env_groups || [];

  let obj: KeyValueArrayMetadata[""] = {
    added: [],
    deleted: [],
  };

  obj.added = differenceBy(currSynced, originalSyncedEnvGroups, "name");
  obj.deleted = differenceBy(originalSyncedEnvGroups, currSynced, "name");

  // This will assure that the variable is always "container.env" and not "container.env.normal" as it is
  // for some old versions of the jobs chart.
  const variableContent = props.variable.split(".");
  let variable = props.variable;

  if (variable.includes("normal")) {
    variable = `${variableContent[0]}.${variableContent[1]}`;
  }

  return {
    [variable]: obj,
  };
};

export default KeyValueArray;

const ExpandableEnvGroup: React.FC<{
  envGroup: PopulatedEnvGroup;
  onDelete: () => void;
}> = ({ envGroup, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <>
      <StyledCard>
        <Flex>
          <ContentContainer>
            <EventInformation>
              <EventName>{envGroup.name}</EventName>
            </EventInformation>
          </ContentContainer>
          <ActionContainer>
            <ActionButton onClick={() => onDelete()}>
              <span className="material-icons">delete</span>
            </ActionButton>
            <ActionButton onClick={() => setIsExpanded((prev) => !prev)}>
              <i className="material-icons">
                {isExpanded ? "arrow_drop_up" : "arrow_drop_down"}
              </i>
            </ActionButton>
          </ActionContainer>
        </Flex>
        {isExpanded && (
          <>
            <Buffer />
            {isObject(envGroup.variables) ? (
              <>
                {Object.entries(envGroup.variables || {})?.map(
                  ([key, value], i: number) => {
                    // Preprocess non-string env values set via raw Helm values
                    if (typeof value === "object") {
                      value = JSON.stringify(value);
                    } else {
                      value = String(value);
                    }

                    return (
                      <InputWrapper key={i}>
                        <KeyInput
                          placeholder="ex: key"
                          width="270px"
                          value={key}
                          disabled
                        />
                        <Spacer />
                        {value?.includes("PORTERSECRET") ? (
                          <KeyInput
                            placeholder="ex: value"
                            width="270px"
                            value={value}
                            disabled
                            type={
                              value.includes("PORTERSECRET")
                                ? "password"
                                : "text"
                            }
                          />
                        ) : (
                          <MultiLineInput
                            placeholder="ex: value"
                            width="270px"
                            value={value}
                            disabled
                            rows={value?.split("\n").length}
                            spellCheck={false}
                          ></MultiLineInput>
                        )}
                      </InputWrapper>
                    );
                  }
                )}
              </>
            ) : (
              <NoVariablesTextWrapper>
                This env group has no variables yet
              </NoVariablesTextWrapper>
            )}

            <Br />
          </>
        )}
      </StyledCard>
    </>
  );
};

const Br = styled.div`
  width: 100%;
  height: 1px;
`;

const Buffer = styled.div`
  width: 100%;
  height: 10px;
`;

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

const Wrapper = styled.div`
  margin-left: 5px;
  height: 20px;
  display: flex;
  align-items: center;
  margin-top: -7px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;

type InputProps = {
  disabled?: boolean;
  width: string;
  borderColor?: string;
};

const KeyInput = styled.input<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid
    ${(props) => (props.borderColor ? props.borderColor : "#ffffff55")};
  border-radius: 3px;
  width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  padding: 5px 10px;
  height: 35px;
`;

export const MultiLineInput = styled.textarea<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid
    ${(props) => (props.borderColor ? props.borderColor : "#ffffff55")};
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

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledInputArray = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div`
  border: 1px solid #ffffff44;
  background: #ffffff11;
  margin-bottom: 5px;
  border-radius: 8px;
  margin-top: 15px;
  padding: 10px 14px;
  overflow: hidden;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;
`;

const Flex = styled.div`
  display: flex;
  height: 25px;
  align-items: center;
  justify-content: space-between;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 40px;
  width: 100%;
  align-items: center;
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  width: 30px;
  height: 30px;
  margin-left: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  border: 1px solid #ffffff00;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;

const NoVariablesTextWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff99;
`;
