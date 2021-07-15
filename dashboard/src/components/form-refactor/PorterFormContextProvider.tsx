import React, { createContext, useReducer } from "react";
import {
  PorterFormData,
  PorterFormState,
  PorterFormAction,
  PorterFormVariableList,
  PorterFormValidationInfo,
} from "./types";
import { ShowIf, ShowIfAnd, ShowIfNot, ShowIfOr } from "../../shared/types";

interface Props {
  rawFormData: PorterFormData;
  initialVariables?: PorterFormVariableList;
  overrideVariables?: PorterFormVariableList;
  isReadOnly?: boolean;
}

interface ContextProps {
  formData: PorterFormData;
  formState: PorterFormState;
  dispatchAction: (event: PorterFormAction) => void;
  validationInfo: PorterFormValidationInfo;
  isReadOnly?: boolean;
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
      case "update-validation":
        return {
          ...state,
          components: {
            ...state.components,
            [action.id]: {
              ...state.components[action.id],
              validation: action.updateFunc(
                state.components[action.id].validation
              ),
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
  and assigns a unique id to each field

  This computed structure also later lets us figure out which fields should be required
  */
  const computeFormStructure = (
    data: PorterFormData,
    variables: PorterFormVariableList
  ) => {
    return {
      ...data,
      tabs: data.tabs.map((tab, i) => {
        return {
          ...tab,
          sections: tab.sections
            .map((section, j) => {
              return {
                ...section,
                contents: section.contents.map((field, k) => {
                  return {
                    ...field,
                    id: `${i}-${j}-${k}`,
                  };
                }),
              };
            })
            .filter((section) => {
              return !section.show_if || evalShowIf(section.show_if, variables);
            }),
        };
      }),
    };
  };
  /*
    compute a list of field ids who's input is required and a map from a variable value
    to a list of fields that set it
  */
  const computeRequiredVariables = (
    data: PorterFormData
  ): [string[], Record<string, string[]>] => {
    const requiredIds: string[] = [];
    const mapping: Record<string, string[]> = {};
    data.tabs.map((tab) =>
      tab.sections.map((section) =>
        section.contents.map((field) => {
          if (field.type == "heading" || field.type == "subtitle") return;
          if (field.required) {
            requiredIds.push(field.id);
          }
          if (!mapping[field.variable]) {
            mapping[field.variable] = [];
          }
          mapping[field.variable].push(field.id);
        })
      )
    );
    return [requiredIds, mapping];
  };

  /*
    Validate the form based
    Will get more complicated over time
   */
  const doValidation = (requiredIds: string[]) =>
    requiredIds
      .map((id) => state.components[id]?.validation.validated)
      .every((x) => x);

  const formData = computeFormStructure(props.rawFormData, state.variables);
  const [requiredIds, varMapping] = computeRequiredVariables(formData);
  const isValidated = doValidation(requiredIds);

  console.group("Validation Info:");
  console.log(requiredIds);
  console.log(varMapping);
  console.log(isValidated);
  console.groupEnd();

  return (
    <Provider
      value={{
        formData: formData,
        formState: state,
        dispatchAction: dispatch,
        isReadOnly: props.isReadOnly,
        validationInfo: {
          validated: isValidated,
          error: isValidated ? null : "Missing required fields",
        },
      }}
    >
      {props.children}
    </Provider>
  );
};
