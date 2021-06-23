import React, { useContext, useEffect } from "react";
import InputRow from "../../values-form/InputRow";
import useFormField from "../hooks/useFormField";
import { StringInputFieldState } from "../types";

interface Props {
  id: string;
}

const StringInput: React.FC<Props> = ({ id }) => {
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
    />
  );
};

export default StringInput;
