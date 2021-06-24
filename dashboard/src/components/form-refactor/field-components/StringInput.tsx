import React, { useContext, useEffect } from "react";
import InputRow from "../../values-form/InputRow";
import useFormField from "../hooks/useFormField";
import { StringInputField, StringInputFieldState } from "../types";

interface Props extends StringInputField {
  id: string;
}

const StringInput: React.FC<Props> = ({
  id,
  label,
  required,
  placeholder,
  info,
}) => {
  const { state, updateState } = useFormField<StringInputFieldState>(id, {
    value: "",
  });

  // TODO: needs a loading wrapper
  if (state == undefined) {
    return <></>;
  }

  return (
    <InputRow
      width="100%"
      type="text"
      value={state.value}
      setValue={(x: string) => {
        updateState((prev) => {
          return {
            ...prev,
            value: x,
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
