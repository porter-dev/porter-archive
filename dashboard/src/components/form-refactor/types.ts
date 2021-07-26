/*
  Interfaces for the form YAML
  Will be merged with shared types later
*/

// YAML Field interfaces

export interface GenericField {
  id: string;
}

export interface GenericInputField extends GenericField {
  isReadOnly?: boolean;
  required?: boolean;
  variable: string;
}

export interface HeadingField extends GenericField {
  type: "heading";
  label: string;
}

export interface SubtitleField extends GenericField {
  type: "subtitle";
  label: string;
}

export interface StringInputFieldSettings {
  type?: "text"|"password"|"number";
  unit?: string;
  omitUnitFromValue?: boolean;
  default: string|number;
}

export interface InputField extends GenericInputField {
  type: "input";
  label?: string;
  placeholder?: string;
  info?: string;
  settings?: StringInputFieldSettings;
}

export interface CheckboxField extends GenericInputField {
  type: "checkbox";
  label?: string;
}

export interface KeyValueArrayField extends GenericInputField {
  type: "key-value-array";
  label?: string;
  secretOption?: boolean;
  envLoader?: boolean;
  fileUpload?: boolean;
}

export type FormField = HeadingField|SubtitleField|InputField|CheckboxField|KeyValueArrayField;

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
}

export interface PorterFormData {
  name: string;
  hasSource: true;
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
    key: string,
    value: string
  }[];
  showEnvModal: boolean;
  showEditorModal: boolean;
}

export type PorterFormFieldFieldState = StringInputFieldState|CheckboxFieldState|KeyValueArrayField;

// reducer interfaces

export interface PorterFormFieldValidationState {
  validated: boolean;
}

export interface PorterFormVariableList {
  [key: string]: any
}

export interface PorterFormState {
  components: {
    [key: string]: {
      state: PorterFormFieldFieldState
      validation: PorterFormFieldValidationState
    }
  }
  variables: PorterFormVariableList
}

export interface PorterFormInitFieldAction {
  type: "init-field",
  id: string;
  initValue: PorterFormFieldFieldState;
  initValidation?: Partial<PorterFormFieldValidationState>
  initVars?: PorterFormVariableList
}

export interface PorterFormUpdateFieldAction {
  type: "update-field",
  id: string;
  updateFunc: (prev: PorterFormFieldFieldState) => Partial<PorterFormFieldFieldState>;
}

export interface PorterFormUpdateValidationAction {
  type: "update-validation",
  id: string;
  updateFunc: (prev: PorterFormFieldValidationState) => PorterFormFieldValidationState;
}

export interface PorterFormMutateVariablesAction {
  type: "mutate-vars",
  mutateFunc: (prev: PorterFormVariableList) => PorterFormVariableList;
}

export type PorterFormAction = PorterFormInitFieldAction|PorterFormUpdateFieldAction|PorterFormMutateVariablesAction|PorterFormUpdateValidationAction;

export type GetFinalVariablesFunction = (vars: PorterFormVariableList, props: FormField, state: PorterFormFieldFieldState) => PorterFormVariableList;