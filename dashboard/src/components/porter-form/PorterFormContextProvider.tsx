import React, { createContext, useContext, useReducer } from "react";
import {
  GetFinalVariablesFunction,
  GetMetadataFunction,
  PorterFormAction,
  PorterFormData,
  PorterFormState,
  PorterFormValidationInfo,
  PorterFormVariableList,
} from "./types";
import {
  ShowIf,
  ShowIfAnd,
  ShowIfIs,
  ShowIfNot,
  ShowIfOr,
} from "../../shared/types";
import { getFinalVariablesForStringInput } from "./field-components/Input";
import {
  getFinalVariablesForKeyValueArray,
  getMetadata as getMetadataForKeyValueArray,
} from "./field-components/KeyValueArray";
import { Context } from "../../shared/Context";
import { getFinalVariablesForArrayInput } from "./field-components/ArrayInput";
import { getFinalVariablesForCheckbox } from "./field-components/Checkbox";
import { getFinalVariablesForSelect } from "./field-components/Select";

export interface BaseProps {
  rawFormData: PorterFormData;
  initialVariables?: PorterFormVariableList;
  overrideVariables?: PorterFormVariableList;
  includeHiddenFields?: boolean;
  isReadOnly?: boolean;
  doDebug?: boolean;
}

export interface PropsWithMetadata extends BaseProps {
  onSubmit: (
    data: { vars: PorterFormVariableList; metadata: PorterFormVariableList },
    cb?: () => void
  ) => void;
  includeMetadata: true;
}

export interface PropsWithoutMetadata extends BaseProps {
  onSubmit: (vars: PorterFormVariableList, cb?: () => void) => void;
  includeMetadata: false;
}

export type Props = PropsWithMetadata | PropsWithoutMetadata;

interface ContextProps {
  formData: PorterFormData;
  formState: PorterFormState;
  onSubmit: (cb?: () => void) => void;
  dispatchAction: (event: PorterFormAction) => void;
  validationInfo: PorterFormValidationInfo;
  getSubmitValues: () => PorterFormVariableList;
  isReadOnly?: boolean;
}

export const PorterFormContext = createContext<ContextProps | undefined>(
  undefined
);
const { Provider } = PorterFormContext;

export const PorterFormContextProvider: React.FC<Props> = (props) => {
  const context = useContext(Context);

  const handleAction = (
    state: PorterFormState,
    action: PorterFormAction
  ): PorterFormState => {
    switch (action?.type) {
      case "init-field":
        if (!(action.id in state.components)) {
          return {
            ...state,
            variables: {
              ...state.variables,
              ...action.initVars,
            },
            components: {
              ...state.components,
              [action.id]: {
                state: action.initValue,
              },
            },
            validation: {
              ...state.validation,
              [action.id]: {
                ...{
                  validated: false,
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
          variables: {
            ...state.variables,
            ...props.overrideVariables,
          },
          components: {
            ...state.components,
            [action.id]: {
              ...state.components[action.id],
              state: {
                ...state.components[action.id].state,
                ...action.updateFunc(state.components[action.id].state),
              },
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
            },
          },
          validation: {
            ...state.validation,
            [action.id]: {
              ...action.updateFunc(state.validation[action.id]),
            },
          },
        };
      case "mutate-vars":
        return {
          ...state,
          variables: {
            ...state.variables,
            ...action.mutateFunc(state.variables),
            ...props.overrideVariables,
          },
        };
    }
    return state;
  };

  // get variables initiated by variable field
  const getInitialVariables = (data: PorterFormData) => {
    const ret: Record<string, any> = {};
    data?.tabs?.map((tab) =>
      tab.sections?.map((section) =>
        section.contents?.map((field) => {
          if (field?.type == "variable") {
            ret[field.variable] = field.settings?.default;
          }
        })
      )
    );

    let scopedVars = {};

    if (data?.isClusterScoped) {
      scopedVars = {
        "currentCluster.service.is_gcp":
          context.currentCluster?.service == "gke",
        "currentCluster.service.is_aws":
          context.currentCluster?.service == "eks",
        "currentCluster.service.is_do":
          context.currentCluster?.service == "doks",
      };
    }

    return {
      ...ret,
      ...scopedVars,
    };
  };

  const getInitialValidation = (data: PorterFormData) => {
    const ret: Record<string, any> = {};
    data?.tabs?.map((tab, i) =>
      tab.sections?.map((section, j) =>
        section.contents?.map((field, k) => {
          if (
            field?.type == "heading" ||
            field?.type == "subtitle" ||
            field?.type == "resource-list" ||
            field?.type == "service-ip-list" ||
            field?.type == "velero-create-backup"
          )
            return;
          if (
            field.required &&
            (field.settings?.default || (field.value && field.value[0]))
          ) {
            ret[`${i}-${j}-${k}`] = {
              validated: true,
            };
          }
        })
      )
    );
    return ret;
  };

  const [state, dispatch] = useReducer(handleAction, {
    components: {},
    validation: getInitialValidation(props.rawFormData),
    variables: {
      ...props.initialVariables,
      ...getInitialVariables(props.rawFormData),
      ...props.overrideVariables,
    },
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
    if ((vals as ShowIfIs).is) {
      vals = vals as ShowIfIs;
      return vals.is == variables[vals.variable];
    }

    if ((vals as ShowIfOr).or) {
      vals = vals as ShowIfOr;
      for (let i = 0; i < vals.or?.length; i++) {
        if (evalShowIf(vals.or[i], variables)) {
          return true;
        }
      }
      return false;
    }
    if ((vals as ShowIfAnd).and) {
      vals = vals as ShowIfAnd;
      for (let i = 0; i < vals.and?.length; i++) {
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
    Takes in old form data and changes it to use newer fields and assigns ids
    For example, number-input becomes input with a setting that makes it
    a number input
   */
  const restructureToNewFields = (data: PorterFormData) => {
    return {
      ...data,
      tabs: data?.tabs?.map((tab, i) => {
        return {
          ...tab,
          sections: tab.sections?.map((section, j) => {
            return {
              ...section,
              contents: section.contents
                ?.map((field: any, k) => {
                  const id = `${i}-${j}-${k}`;
                  if (field?.type == "number-input") {
                    return {
                      id,
                      ...field,
                      type: "input",
                      settings: {
                        ...field.settings,
                        type: "number",
                      },
                    };
                  }
                  if (field?.type == "string-input") {
                    return {
                      id,
                      ...field,
                      type: "input",
                      settings: {
                        ...field.settings,
                        type: "string",
                      },
                    };
                  }
                  if (field?.type == "string-input-password") {
                    return {
                      id,
                      ...field,
                      type: "input",
                      settings: {
                        ...field.settings,
                        type: "password",
                      },
                    };
                  }
                  if (field?.type == "provider-select") {
                    return {
                      id,
                      ...field,
                      type: "select",
                      settings: {
                        ...field.settings,
                        type: "provider",
                      },
                    };
                  }
                  if (field?.type == "env-key-value-array") {
                    return {
                      id,
                      ...field,
                      type: "key-value-array",
                      secretOption: true,
                      envLoader: true,
                      fileUpload: true,
                      settings: {
                        ...(field.settings || {}),
                        type: "env",
                      },
                    };
                  }
                  if (field?.type == "variable") return null;
                  return {
                    id,
                    ...field,
                  };
                })
                .filter((x) => x != null),
            };
          }),
        };
      }),
    };
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
      tabs: data?.tabs?.map((tab, i) => {
        return {
          ...tab,
          sections: tab.sections
            ?.map((section, j) => {
              return {
                ...section,
                contents: section.contents?.map((field, k) => {
                  return {
                    ...field,
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
    data?.tabs?.map((tab) =>
      tab.sections?.map((section) =>
        section.contents?.map((field) => {
          if (
            field?.type == "heading" ||
            field?.type == "subtitle" ||
            field?.type == "resource-list" ||
            field?.type == "service-ip-list" ||
            field?.type == "velero-create-backup"
          )
            return;
          // fields that have defaults can't be required since we can always
          // compute their value
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
    Validate the form based on a list of required ids
   */
  const doValidation = (requiredIds: string[]) =>
    requiredIds?.map((id) => state.validation[id]?.validated).every((x) => x);

  const formData = computeFormStructure(
    restructureToNewFields(props.rawFormData),
    state.variables
  );
  const [requiredIds, varMapping] = computeRequiredVariables(formData);
  const isValidated = doValidation(requiredIds);

  /*
  Handle submit
  This involves going through all the (currently active) fields in the form and
  using functions for each input to finalize the variables
  This can take care of things like appending units to strings
 */
  const getSubmitValues = () => {
    // we start off with a base list of the current variables for fields
    // that don't need any processing on top (for example: checkbox)
    // the assign here is important because that way state.variable isn't mutated
    const varList: PorterFormVariableList[] = [
      Object.assign({}, state.variables),
    ];
    const finalFunctions: Record<string, GetFinalVariablesFunction> = {
      input: getFinalVariablesForStringInput,
      "array-input": getFinalVariablesForArrayInput,
      checkbox: getFinalVariablesForCheckbox,
      "key-value-array": getFinalVariablesForKeyValueArray,
      select: getFinalVariablesForSelect,
    };

    const data = props.includeHiddenFields
      ? restructureToNewFields(props.rawFormData)
      : props.rawFormData.includeHiddenFields
      ? restructureToNewFields(props.rawFormData)
      : formData;

    data?.tabs?.map((tab) =>
      tab.sections?.map((section) =>
        section.contents?.map((field) => {
          if (finalFunctions[field?.type]) {
            varList.push(
              finalFunctions[field?.type](
                state.variables,
                field,
                state.components[field.id]?.state,
                context
              )
            );
          }
        })
      )
    );

    if (props.includeMetadata) {
      const metadataFunctions: Record<string, GetMetadataFunction> = {
        "key-value-array": getMetadataForKeyValueArray,
      };
      const metadataList: PorterFormVariableList[] = [];
      data?.tabs?.map((tab) =>
        tab.sections?.map((section) =>
          section.contents?.map((field) => {
            if (metadataFunctions[field?.type]) {
              metadataList.push(
                metadataFunctions[field?.type](
                  state.variables,
                  field,
                  state.components[field.id]?.state,
                  context
                )
              );
            }
          })
        )
      );

      if (props.doDebug)
        console.log({
          values: Object.assign.apply({}, varList),
          metadata: Object.assign.apply({}, metadataList),
        });

      return {
        values: Object.assign.apply({}, varList),
        metadata: Object.assign.apply({}, metadataList),
      };
    }

    if (props.doDebug) console.log(Object.assign.apply({}, varList));

    return Object.assign.apply({}, varList);
  };

  const onSubmitWrapper = (cb?: () => void) => {
    props.onSubmit(getSubmitValues(), cb);
  };

  if (props.doDebug) {
    console.group("Validation Info:");
    console.log(requiredIds);
    console.log(varMapping);
    console.log(isValidated);
    console.groupEnd();
  }

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
        onSubmit: onSubmitWrapper,
        getSubmitValues,
      }}
    >
      {props.children}
    </Provider>
  );
};
