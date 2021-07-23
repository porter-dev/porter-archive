import React from "react";
import { CheckboxField, CheckboxFieldState } from "../types";
import CheckboxRow from "../../values-form/CheckboxRow";
import useFormField from "../hooks/useFormField";

interface Props extends CheckboxField {
  id: string;
}

const Checkbox: React.FC<Props> = ({
  id,
  label,
  required,
  variable,
  isReadOnly,
}) => {
  const { state, variables, setVars } = useFormField<CheckboxFieldState>(
    id,
    {
      initValue: {},
      initValidation: {
        validated: !required,
      },
      initVars: {},
    }
  );

  if (state == undefined) {
    return <></>;
  }

  return (
    <CheckboxRow
      isRequired={required}
      checked={variables[variable]}
      toggle={() => {
        setVars((vars) => {
          return {
            ...vars,
            [variable]: !vars[variable],
          };
        });
      }}
      label={label}
      disabled={isReadOnly}
    />
  );
};

export default Checkbox;
