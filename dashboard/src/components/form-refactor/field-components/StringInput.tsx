import React from "react";
import InputRow from "../../values-form/InputRow";
import useFormField from "../hooks/useFormField";
import { StringInputField, StringInputFieldState } from "../types";

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
}) => {
  const { state, variables, mutateVars } = useFormField<StringInputFieldState>(
    id,
    {
      initValue: {},
      initValidation: {
        validated: !required,
      },
    }
  );

  // TODO: needs a loading wrapper
  if (state == undefined) {
    return <></>;
  }

  const curValue =
    settings?.type == "number"
      ? parseFloat(variables[variable]) || ""
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
      }}
      label={label}
      isRequired={required}
      placeholder={placeholder}
      info={info}
    />
  );
};

export default StringInput;
