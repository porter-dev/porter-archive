import React, { createContext, useReducer } from "react";
import { PorterFormData, PorterFormState, PorterFormAction } from "./types";

interface Props {
  formData: PorterFormData;
}

interface ContextProps {
  formData: PorterFormData;
  formState: PorterFormState;
  dispatchAction: (event: PorterFormAction) => void;
}

export const PorterFormContext = createContext<ContextProps | undefined>(
  undefined!
);
const { Provider } = PorterFormContext;

export const PorterFormContextProvider: React.FC<Props> = (props) => {
  const handleAction = (
    state: PorterFormState,
    action: PorterFormAction
  ): PorterFormState => {
    switch (action.type) {
      case "init-field":
        if (!(action.id in state.components)) {
          return {
            ...state,
            components: {
              ...state.components,
              [action.id]: action.initValue,
            },
            validation: {
              ...state.validation,
              [action.id]: {
                ...{
                  error: false,
                  loading: false,
                  validated: false,
                  touched: false,
                },
                ...action.initValidation,
              },
            },
          };
        }
        break;
      case "update-field":
        return {
          ...state,
          components: {
            ...state.components,
            [action.id]: action.updateFunc(state.components[action.id]),
          },
        };
    }
    return state;
  };

  const [state, dispatch] = useReducer(handleAction, {
    components: {},
    validation: {},
  });

  return (
    <Provider
      value={{
        formData: props.formData,
        formState: state,
        dispatchAction: dispatch,
      }}
    >
      {props.children}
    </Provider>
  );
};
