/*
  Interfaces for the form YAML
  Will be merged with shared types later
*/

// YAML Field interfaces

export interface HeadingField {
  type: "heading";
  label: string;
}

export interface SubtitleField {
  type: "subtitle";
  label: string;
}

export interface StringInputField {
  type: "string-input";
  label?: string;
  required?: boolean;
  placeholder?: string;
  info?: string;
}

export type FormField = HeadingField|SubtitleField|StringInputField;

export interface Section {
  name: string;
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

export interface StringInputFieldState {
  value: string;
}

export type PorterFormFieldFieldState = StringInputFieldState;

// reducer interfaces

export interface PorterFormState {
  components: {
    [key: string]: PorterFormFieldFieldState
  }
}

export interface PorterFormInitFieldAction {
  type: "init-field",
  id: string;
  initValue: PorterFormFieldFieldState;
}

export interface PorterFormUpdateFieldAction {
  type: "update-field",
  id: string;
  updateFunc: (prev: PorterFormFieldFieldState) => PorterFormFieldFieldState;
}

export type PorterFormAction = PorterFormInitFieldAction|PorterFormUpdateFieldAction;
