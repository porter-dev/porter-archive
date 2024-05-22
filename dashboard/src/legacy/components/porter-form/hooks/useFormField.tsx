import { useContext, useEffect } from "react";
import { PorterFormContext } from "../PorterFormContextProvider";
import {
  PorterFormFieldFieldState,
  PorterFormFieldValidationState,
  PorterFormVariableList,
} from "../types";

interface FormFieldData<T> {
  state: T;
  variables: PorterFormVariableList;
  validation: { [key: string]: PorterFormFieldValidationState };
  setState: (setFunc: (prev: T) => Partial<T>) => void;
  setVars: (
    setFunc: (vars: PorterFormVariableList) => PorterFormVariableList
  ) => void;
  setValidation: (
    setFunc: (
      state: PorterFormFieldValidationState
    ) => PorterFormFieldValidationState
  ) => void;
}

interface Options<T> {
  initState?: T | (() => T);
  initValidation?: Partial<PorterFormFieldValidationState>;
  initVars?: PorterFormVariableList;
}

const useFormField = <T extends PorterFormFieldFieldState>(
  fieldId: string,
  { initState, initVars, initValidation }: Options<T>
): FormFieldData<T> => {
  const { dispatchAction, formState } = useContext(PorterFormContext);

  useEffect(() => {
    if (typeof initState === "function") {
      dispatchAction({
        type: "init-field",
        id: fieldId,
        initValue: initState() || {},
        initValidation: initValidation || {
          validated: false,
        },
        initVars: initVars || {},
      });
      return;
    }

    dispatchAction({
      type: "init-field",
      id: fieldId,
      initValue: initState || {},
      initValidation: initValidation || {
        validated: false,
      },
      initVars: initVars || {},
    });
  }, []);

  const setState = (updateFunc: (prev: T) => Partial<T>) => {
    dispatchAction({
      type: "update-field",
      id: fieldId,
      updateFunc,
    });
  };

  const setVars = (
    mutateFunc: (vars: PorterFormVariableList) => PorterFormVariableList
  ) => {
    dispatchAction({
      type: "mutate-vars",
      mutateFunc,
    });
  };

  const setValidation = (
    updateFunc: (
      state: PorterFormFieldValidationState
    ) => PorterFormFieldValidationState
  ) => {
    dispatchAction({
      id: fieldId,
      type: "update-validation",
      updateFunc,
    });
  };

  return {
    state: formState.components[fieldId]?.state as T,
    variables: formState.variables,
    validation: formState.validation,
    setState,
    setVars,
    setValidation,
  };
};

export default useFormField;
