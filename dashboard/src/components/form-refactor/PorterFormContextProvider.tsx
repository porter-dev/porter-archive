import React, { createContext, useReducer } from "react";
import {
  PorterFormData,
  PorterFormState,
  PorterFormAction,
  PorterFormVariableList,
} from "./types";
import { ShowIf, ShowIfAnd, ShowIfNot, ShowIfOr } from "../../shared/types";

interface Props {
  rawFormData: PorterFormData;
  initialVariables?: PorterFormVariableList;
  overrideVariables?: PorterFormVariableList;
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
              [action.id]: {
                state: action.initValue,
                validation: {
                  ...{
                    error: false,
                    loading: false,
                    validated: false,
                    touched: false,
                  },
                  ...action.initValidation,
                },
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
            [action.id]: {
              ...state.components[action.id],
              state: action.updateFunc(state.components[action.id]),
            },
          },
        };
      case "mutate-vars":
        return {
          ...state,
          variables: {
            ...action.mutateFunc(state.variables),
            ...props.overrideVariables,
          },
        };
    }
    return state;
  };

  const [state, dispatch] = useReducer(handleAction, {
    components: {},
    variables: props.initialVariables || {},
  });

  const evalShowIf = (
    vals: ShowIf,
    variables: PorterFormVariableList
  ): boolean => {
    if (!vals) {
      return false;
    }
    if (typeof vals == "string") {
      return !!variables[vals];
    }
    if ((vals as ShowIfOr).or) {
      vals = vals as ShowIfOr;
      for (let i = 0; i < vals.or.length; i++) {
        if (evalShowIf(vals.or[i], variables)) {
          return true;
        }
      }
      return false;
    }
    if ((vals as ShowIfAnd).and) {
      vals = vals as ShowIfAnd;
      for (let i = 0; i < vals.and.length; i++) {
        if (!evalShowIf(vals.and[i], variables)) {
          return false;
        }
      }
      return true;
    }
    if ((vals as ShowIfNot).not) {
      vals = vals as ShowIfNot;
      return !evalShowIf(vals.not, variables);
    }

    return false;
  };

  /*
  We don't want to have the actual <PorterForm> component to do as little form
  logic as possible, so this structures the form object based on show_if statements

  This computed structure also later lets us figure out which fields should be required
  */
  const computeFormStructure = (
    data: PorterFormData,
    variables: PorterFormVariableList
  ) => {
    return {
      ...data,
      tabs: data.tabs.map((tab) => {
        return {
          ...tab,
          sections: tab.sections.filter((section) => {
            return !section.show_if || evalShowIf(section.show_if, variables);
          }),
        };
      }),
    };
  };

  const formData = computeFormStructure(props.rawFormData, state.variables);

  return (
    <Provider
      value={{
        formData: formData,
        formState: state,
        dispatchAction: dispatch,
      }}
    >
      {props.children}
    </Provider>
  );
};
