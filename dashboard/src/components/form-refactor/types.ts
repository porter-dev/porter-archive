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

export interface HeadingField extends GenericField{
  type: "heading";
  label: string;
}

export interface SubtitleField extends GenericField{
  type: "subtitle";
  label: string;
}

export interface StringInputFieldSettings {
  type?: "text"|"password"|"number";
  unit?: string;
  omitUnitFromValue?: boolean;
  default: string|number;
}

export interface StringInputField extends GenericInputField {
  type: "string-input";
  label?: string;
  placeholder?: string;
  info?: string;
  settings?: StringInputFieldSettings;
}

export interface CheckboxField extends GenericInputField {
  type: "checkbox";
  label?: string;
}

export type FormField = HeadingField|SubtitleField|StringInputField|CheckboxField;

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

export type PorterFormFieldFieldState = StringInputFieldState|CheckboxFieldState;

// reducer interfaces

export interface PorterFormFieldValidationState {
  loading: boolean;
  error: boolean;
  validated: boolean;
  touched: boolean;
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
  updateFunc: (prev: PorterFormFieldFieldState) => PorterFormFieldFieldState;
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