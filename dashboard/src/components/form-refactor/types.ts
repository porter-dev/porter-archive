/*
  Interfaces for the form YAML
  Will be merged with shared types later
*/

// YAML Field interfaces

export interface DefaultFieldSettings {
  required: boolean;
}

export interface HeadingField {
  type: "heading";
  label: string;
}

export interface SubtitleField {
  type: "subtitle";
  label: string;
}

export interface StringInputFieldSettings extends DefaultFieldSettings {
  type: "text"|"password"|"number";
}

export interface StringInputField {
  type: "string-input";
  variable: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  info?: string;
  settings?: StringInputFieldSettings;
}

export interface CheckboxField {
  type: "checkbox";
  label?: string;
  variable: string;
  required?: boolean;
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
}

export interface PorterFormUpdateFieldAction {
  type: "update-field",
  id: string;
  updateFunc: (prev: PorterFormFieldFieldState) => PorterFormFieldFieldState;
}

export interface PorterFormMutateVariablesAction {
  type: "mutate-vars",
  mutateFunc: (prev: PorterFormVariableList) => PorterFormVariableList;
}

export type PorterFormAction = PorterFormInitFieldAction|PorterFormUpdateFieldAction|PorterFormMutateVariablesAction;
