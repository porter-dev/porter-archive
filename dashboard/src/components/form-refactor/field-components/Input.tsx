import React from "react";
import InputRow from "../../values-form/InputRow";
import useFormField from "../hooks/useFormField";
import {
  GenericInputField,
  GetFinalVariablesFunction,
  InputField,
  StringInputFieldState,
} from "../types";

const Input: React.FC<InputField> = ({
  id,
  variable,
  label,
  required,
  placeholder,
  info,
  settings,
  isReadOnly,
  value,
}) => {
  const {
    state,
    variables,
    setVars,
    setValidation,
  } = useFormField<StringInputFieldState>(id, {
    initValidation: {
      validated: value
        ? value[0] !== undefined
        : settings?.default != undefined,
    },
    initVars: {
      [variable]: value ? value[0] : settings?.default,
    },
  });

  if (state == undefined) {
    return <></>;
  }

  const curValue =
    settings?.type == "number"
      ? !isNaN(parseFloat(variables[variable]))
        ? parseFloat(variables[variable])
        : ""
      : variables[variable] || "";

  return (
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
  );
};

export const getFinalVariablesForStringInput: GetFinalVariablesFunction = (
  vars,
  props: InputField
) => {
  const val = vars[props.variable] || props.settings?.default;
  return {
    [props.variable]:
      props.settings?.unit && props.settings?.omitUnitFromValue === false
        ? val + props.settings.unit
        : val,
  };
};

export default Input;
