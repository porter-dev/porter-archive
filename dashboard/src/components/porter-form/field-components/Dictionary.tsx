import React, { useEffect } from "react";
import InputRow from "../../form-components/InputRow";
import useFormField from "../hooks/useFormField";
import {
  GetFinalVariablesFunction,
  DictionaryField,
  DictionaryFieldState,
} from "../types";
import DictionaryEditor from "components/porter/DictionaryEditor";
import { hasSetValue } from "../utils";

const Dictionary: React.FC<DictionaryField> = (props) => {
  const {
    state,
    variables,
    setVars,
    setValidation,
  } = useFormField<DictionaryFieldState>(props.id, {
    initValidation: {
      validated: hasSetValue(props),
    },
    initVars: {
      [props.variable]: hasSetValue(props) ? props.value[0] : undefined,
    },
  });

  if (state == undefined) return <></>;

  return (
    <>
    <DictionaryEditor
      value={props?.value && props.value[0]}
      onChange={(x: any) => {
        setVars((vars) => {
          return {
            ...vars,
            [props.variable]: x,
          };
        });
        setValidation((prev) => {
          return {
            ...prev,
            validated: true,
          };
        });
      }}
    />
    {/*
    <InputRow
      width="100%"
      type={settings?.type || "text"}
      value={curValue}
      unit={settings?.unit}
      setValue={(x: string | number) => {
        setVars((vars) => {
          return {
            ...vars,
            [variable]: x,
          };
        });
        setValidation((prev) => {
          return {
            ...prev,
            validated:
              settings?.type == "number"
                ? !isNaN(x as number)
                : !!(x as string).trim(),
          };
        });
      }}
      label={label}
      isRequired={required}
      placeholder={placeholder}
      info={info}
      disabled={isReadOnly}
    />
    */}
    </>
  );
};

export const getFinalVariablesForStringInput: GetFinalVariablesFunction = (
  vars,
  props: DictionaryField
) => {
  const val =
    vars[props.variable] != undefined && vars[props.variable] != null
      ? vars[props.variable] : hasSetValue(props)
      ? props.value[0] : undefined;

  return {
    [props.variable]:
      props.settings?.unit && !props.settings.omitUnitFromValue
        ? val + props.settings.unit
        : val,
  };
};

export default Dictionary;
