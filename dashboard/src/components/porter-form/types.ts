/*
  Interfaces for the form YAML
  Will be merged with shared types later
*/

// YAML Field interfaces

import { ContextProps } from "../../shared/types";

export interface GenericField {
  id: string;
}

export interface GenericInputField extends GenericField {
  isReadOnly?: boolean;
  required?: boolean;
  variable: string;
  settings?: any;

  // Read in value from Helm for existing revisions
  value?: any[];
}

export interface HeadingField extends GenericField {
  type: "heading";
  label: string;
}

export interface SubtitleField extends GenericField {
  type: "subtitle";
  label: string;
}

export interface ServiceIPListField extends GenericField {
  type: "service-ip-list";
  value: any[];
}

export interface ResourceListField extends GenericField {
  type: "resource-list";
  value: any[];
}

export interface VeleroBackupField extends GenericField {
  type: "velero-create-backup";
}

export interface InputField extends GenericInputField {
  type: "input";
  label?: string;
  placeholder?: string;
  info?: string;
  settings?: {
    type?: "text" | "password" | "number";
    unit?: string;
    omitUnitFromValue?: boolean;
    default: string | number;
  };
}

export interface CheckboxField extends GenericInputField {
  type: "checkbox";
  label?: string;
  settings?: {
    default: boolean;
  };
}

export interface KeyValueArrayField extends GenericInputField {
  type: "key-value-array";
  label?: string;
  secretOption?: boolean;
  envLoader?: boolean;
  fileUpload?: boolean;
  settings?: {
    type: "env" | "normal";
  };
}

export interface ArrayInputField extends GenericInputField {
  type: "array-input";
  label?: string;
}

export interface SelectField extends GenericInputField {
  type: "select";
  settings:
    | {
        type: "normal";
        options: { value: string; label: string }[];
        default?: string;
      }
    | {
        type: "provider";
        default?: string;
      };
  width: string;
  label?: string;
  dropdownLabel?: string;
  dropdownWidth?: number;
  dropdownMaxHeight?: string;
}

export interface VariableField extends GenericInputField {
  type: "variable";
  settings?: {
    default: any;
  };
}

export type FormField =
  | HeadingField
  | SubtitleField
  | InputField
  | CheckboxField
  | KeyValueArrayField
  | ArrayInputField
  | SelectField
  | ServiceIPListField
  | ResourceListField
  | VeleroBackupField
  | VariableField;

export interface ShowIfAnd {
  and: ShowIf[];
}

export interface ShowIfOr {
  or: ShowIf[];
}

export interface ShowIfNot {
  not: ShowIf;
}

export type ShowIf = string | ShowIfAnd | ShowIfOr | ShowIfNot;

export interface Section {
  name: string;
  show_if?: ShowIf;
  contents: FormField[];
}

export interface Tab {
  name: string;
  label: string;
  sections: Section[];
  settings?: {
    omitFromLaunch?: boolean;
  }
}

export interface PorterFormData {
  name: string;
  hasSource: boolean;
  includeHiddenFields: boolean;
  tabs: Tab[];
}

export interface PorterFormValidationInfo {
  validated: boolean;
  error?: string;
}

// internal field state interfaces
export interface StringInputFieldState {}
export interface CheckboxFieldState {}
export interface KeyValueArrayFieldState {
  values: {
    key: string;
    value: string;
  }[];
  showEnvModal: boolean;
  showEditorModal: boolean;
}
export interface ArrayInputFieldState {}
export interface SelectFieldState {}

export type PorterFormFieldFieldState =
  | StringInputFieldState
  | CheckboxFieldState
  | KeyValueArrayField
  | ArrayInputFieldState
  | SelectFieldState;

// reducer interfaces

export interface PorterFormFieldValidationState {
  validated: boolean;
}

export interface PorterFormVariableList {
  [key: string]: any;
}

export interface PorterFormState {
  components: {
    [key: string]: {
      state: PorterFormFieldFieldState;
      validation: PorterFormFieldValidationState;
    };
  };
  variables: PorterFormVariableList;
}

export interface PorterFormInitFieldAction {
  type: "init-field";
  id: string;
  initValue: PorterFormFieldFieldState;
  initValidation?: Partial<PorterFormFieldValidationState>;
  initVars?: PorterFormVariableList;
}

export interface PorterFormUpdateFieldAction {
  type: "update-field";
  id: string;
  updateFunc: (
    prev: PorterFormFieldFieldState
  ) => Partial<PorterFormFieldFieldState>;
}

export interface PorterFormUpdateValidationAction {
  type: "update-validation";
  id: string;
  updateFunc: (
    prev: PorterFormFieldValidationState
  ) => PorterFormFieldValidationState;
}

export interface PorterFormMutateVariablesAction {
  type: "mutate-vars";
  mutateFunc: (prev: PorterFormVariableList) => PorterFormVariableList;
}

export type PorterFormAction =
  | PorterFormInitFieldAction
  | PorterFormUpdateFieldAction
  | PorterFormMutateVariablesAction
  | PorterFormUpdateValidationAction;

export type GetFinalVariablesFunction = (
  vars: PorterFormVariableList,
  props: FormField,
  state: PorterFormFieldFieldState,
  context: Partial<ContextProps>
) => PorterFormVariableList;
