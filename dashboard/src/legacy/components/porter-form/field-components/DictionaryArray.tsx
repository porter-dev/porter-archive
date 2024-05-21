import React from "react";
import styled from "styled-components";
import {
  DictionaryArrayField,
  DictionaryArrayFieldState,
  GetFinalVariablesFunction,
} from "../types";
import useFormField from "../hooks/useFormField";
import { hasSetValue } from "../utils";
import DictionaryEditor from "components/porter/DictionaryEditor";

// this is used to set validation for the below form component in case
// input validation needs to get more complicated in the future
const validateArray = (arr: any[]) => {
  return true;
};

const DictionaryArray: React.FC<DictionaryArrayField> = (props) => {
  const {
    state,
    variables,
    setVars,
    setValidation,
  } = useFormField<DictionaryArrayFieldState>(props.id, {
    initVars: {
      [props.variable]: hasSetValue(props) ? props.value[0] : [],
    },
    initValidation: {
      validated: validateArray(hasSetValue(props) ? props.value[0] : []),
    },
  });

  if (state == undefined) return <></>;

  const renderDeleteButton = (values: string[], i: number) => {
    if (!props.isReadOnly) {
      return (
        <DeleteButton
          onClick={() => {
            setVars((prev) => {
              const val = prev[props.variable]
                .slice(0, i)
                .concat(prev[props.variable].slice(i + 1));
              setValidation((prev) => {
                return {
                  ...prev,
                  validated: validateArray(val),
                };
              });
              return {
                [props.variable]: val,
              };
            });
          }}
        >
          <i className="material-icons">cancel</i>
        </DeleteButton>
      );
    }
  };

  const renderInputList = (values: string[]) => {
    return (
      <>
        {values.length > 0 && values.map((value: string, i: number) => {
          return (
            <InputWrapper>
              <DictionaryEditor
                key={i}
                value={value}
                onChange={(e: any) => {
                  setVars((prev) => {
                    const val = prev[props.variable]?.map(
                      (t: string, j: number) => {
                        return i == j ? e : t;
                      }
                    );
                    setValidation((prev) => {
                      return {
                        ...prev,
                        validated: validateArray(val),
                      };
                    });
                    return {
                      [props.variable]: val,
                    };
                  });
                }}
              />
              {renderDeleteButton(values, i)}
            </InputWrapper>
          );
        })}
      </>
    );
  };

  return (
    <StyledInputArray>
      <Label>
        {props.label}
        {props.required && <Required>{" *"}</Required>}
      </Label>
      {variables[props.variable] === 0 ? (
        <></>
      ) : (
        renderInputList(variables[props.variable])
      )}
      <AddRowButton
        onClick={() => {
          setVars((prev) => {
            return {
              [props.variable]: [...prev[props.variable], ""],
            };
          });
        }}
      >
        <i className="material-icons">add</i> Create new entry
      </AddRowButton>
    </StyledInputArray>
  );
};

export default DictionaryArray;

export const getFinalVariablesForArrayInput: GetFinalVariablesFunction = (
  vars,
  props: DictionaryArrayField
) => {
  return vars[props.variable] != undefined && vars[props.variable] != null
    ? {}
    : {
        [props.variable]: hasSetValue(props) ? props.value[0] : [],
      };
};

const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 30px;
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

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
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

const Required = styled.span`
  color: #fc4976;
`;
