import React from "react";
import InputRow from "../../values-form/InputRow";
import useFormField from "../hooks/useFormField";
import {
  GenericInputField,
  StringInputField,
  StringInputFieldState,
} from "../types";

interface Props extends StringInputField {
  id: string;
}

const StringInput: React.FC<Props> = ({
  id,
  variable,
  label,
  required,
  placeholder,
  info,
  settings,
  isReadOnly,
}) => {
  const {
    state,
    variables,
    mutateVars,
    updateValidation,
  } = useFormField<StringInputFieldState>(id, {
    initValue: {},
    initValidation: {
      validated: false,
    },
  });

  // TODO: needs a loading wrapper
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
        mutateVars((vars) => {
          return {
            ...vars,
            [variable]: x,
          };
        });
        updateValidation((prev) => {
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

export default StringInput;
