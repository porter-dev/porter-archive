import { useContext, useEffect } from "react";
import { PorterFormContext } from "../PorterFormContextProvider";
import {
  PorterFormFieldFieldState,
  PorterFormFieldValidationState,
} from "../types";

interface FormFieldData<T> {
  state: T;
  updateState: (updateFunc: (prev: T) => T) => void;
}

interface Options<T> {
  initValue: T;
  initValidation?: Partial<PorterFormFieldValidationState>;
}

const useFormField = <T extends PorterFormFieldFieldState>(
  fieldId: string,
  { initValue, initValidation }: Options<T>
): FormFieldData<T> => {
  const { dispatchAction, formState } = useContext(PorterFormContext);

  useEffect(() => {
    dispatchAction({
      type: "init-field",
      id: fieldId,
      initValue,
      initValidation,
    });
  }, []);

  const updateState = (updateFunc: (prev: T) => T) => {
    dispatchAction({
      type: "update-field",
      id: fieldId,
      updateFunc,
    });
  };

  return {
    state: formState.components[fieldId] as T,
    updateState,
  };
};

export default useFormField;
