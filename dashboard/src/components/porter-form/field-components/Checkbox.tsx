import React from "react";
import {
  ArrayInputField,
  CheckboxField,
  CheckboxFieldState,
  GetFinalVariablesFunction,
} from "../types";
import CheckboxRow from "../../form-components/CheckboxRow";
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
  settings,
  value,
}) => {
  const { state, variables, setVars } = useFormField<CheckboxFieldState>(id, {
    initState: {},
    initValidation: {
      validated: !required,
    },
    initVars: {
      [variable]: value ? value[0] : !!settings?.default,
    },
  });

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

export const getFinalVariablesForCheckbox: GetFinalVariablesFunction = (
  vars,
  props: CheckboxField
) => {
  if (vars[props.variable] === false) {
    return { [props.variable]: false };
  } else if (vars[props.variable] === true) {
    return { [props.variable]: true };
  }
  return {
    [props.variable]: props.value ? props.value[0] : !!props.settings?.default,
  };
};
