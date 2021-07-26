import React from "react";
import { KeyValueArrayField, KeyValueArrayFieldState } from "../types";
import sliders from "../../../assets/sliders.svg";
import upload from "../../../assets/upload.svg";
import styled from "styled-components";
import useFormField from "../hooks/useFormField";

interface Props extends KeyValueArrayField {
  id: string;
}

const KeyValueArray: React.FC<Props> = (props) => {
  const { state, setState, variables } = useFormField<KeyValueArrayFieldState>(
    props.id,
    {
      initState: {
        values: [],
        showEnvModal: false,
        showEditorModal: false,
      },
    }
  );

  console.log(state);

  if (state == undefined) return <></>;

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
        {state.values.map((entry: any, i: number) => {
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
                      values: prev.values.map((t, j) => {
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
                      values: prev.values.map((t, j) => {
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
                  console.log(prev);
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
      {/*{renderEnvModal()}*/}
      {/*{renderEditorModal()}*/}
    </>
  );
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
